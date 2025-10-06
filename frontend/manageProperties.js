import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZuEC4QU-RYxQbjWqBoxk6j1mbwwRtRBo",
  authDomain: "inrent-6ab14.firebaseapp.com",
  databaseURL: "https://inrent-6ab14-default-rtdb.firebaseio.com",
  projectId: "inrent-6ab14",
  storageBucket: "inrent-6ab14.firebasestorage.app",
  messagingSenderId: "327416190792",
  appId: "1:327416190792:web:970377ec8dcef557e5457d",
  measurementId: "G-JY9E760ZQ0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Collections
const COLLECTIONS = {
  PROPERTIES: 'properties',
  USERS: 'users',
  MAINTENANCE: 'maintenanceRequests',
  PAYMENTS: 'payments',
  MOVEOUT: 'moveOutNotices',
  BOOKINGS: 'bookings'
};

const ROLES = { STUDENT: 'STUDENT', LANDLORD: 'LANDLORD' };

// Helper functions
function getCurrentUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
}

async function getUserData(userId) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');
  return { id: userSnap.id, ...userSnap.data() };
}

// Maintenance Request Management
class MaintenanceManager {
  async createRequest(propertyId, problemType, urgency, description = '') {
    if (!problemType || !urgency) throw new Error('Problem type and urgency are required');

    try {
      const studentId = getCurrentUserId();
      const student = await getUserData(studentId);
      if (student.role !== ROLES.STUDENT) throw new Error('Only students can create maintenance requests');

      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      const propertySnap = await getDoc(propertyRef);
      if (!propertySnap.exists()) throw new Error('Property not found');

      const property = propertySnap.data();
      const request = {
        propertyId, propertyTitle: property.title, propertyAddress: property.address,
        studentId, studentName: student.firstName, studentEmail: student.email,
        landlordId: property.landlordId, landlordName: property.landlordName, landlordEmail: property.landlordEmail,
        problemType: problemType.trim(), urgency, description: description.trim(),
        status: 'pending', dateCreated: serverTimestamp(), dateResolved: null, assignedTo: null, notes: []
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.MAINTENANCE), request);
      await this.notifyLandlord(property, student, request);

      return { success: true, message: 'Maintenance request submitted successfully', requestId: docRef.id };
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      throw error;
    }
  }

  async getRequests(filter = {}) {
    try {
      const userId = getCurrentUserId();
      const user = await getUserData(userId);

      let q = query(collection(db, COLLECTIONS.MAINTENANCE),
        where(user.role === ROLES.STUDENT ? 'studentId' : 'landlordId', '==', userId));

      if (filter.status) q = query(q, where('status', '==', filter.status));
      if (filter.urgency) q = query(q, where('urgency', '==', filter.urgency));
      q = query(q, orderBy('dateCreated', 'desc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      throw error;
    }
  }

  async updateRequestStatus(requestId, status, notes = '') {
    try {
      const userId = getCurrentUserId();
      const user = await getUserData(userId);
      if (user.role !== ROLES.LANDLORD) throw new Error('Only landlords can update maintenance requests');

      const requestRef = doc(db, COLLECTIONS.MAINTENANCE, requestId);
      const requestSnap = await getDoc(requestRef);
      if (!requestSnap.exists()) throw new Error('Request not found');
      if (requestSnap.data().landlordId !== userId) throw new Error('Unauthorized');

      const updateData = { status, lastUpdated: serverTimestamp() };
      if (notes) updateData.notes = arrayUnion({ text: notes, date: new Date().toISOString(), addedBy: user.firstName });
      if (status === 'resolved') updateData.dateResolved = serverTimestamp();

      await updateDoc(requestRef, updateData);
      return { success: true, message: `Request status updated to ${status}` };
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  async notifyLandlord(property, student, request) {
    console.log('Email to landlord:', property.landlordEmail, request);
  }
}

// Payment Management
class PaymentManager {
  async processPayment(propertyId, amount, method = 'card', paymentType = 'rent', notes = '') {
    if (!amount || amount <= 0) throw new Error('Invalid payment amount');

    try {
      const studentId = getCurrentUserId();
      const student = await getUserData(studentId);
      if (student.role !== ROLES.STUDENT) throw new Error('Only students can make payments');

      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      const propertySnap = await getDoc(propertyRef);
      if (!propertySnap.exists()) throw new Error('Property not found');

      const property = propertySnap.data();
      const payment = {
        propertyId, propertyTitle: property.title, studentId, studentName: student.firstName, studentEmail: student.email,
        landlordId: property.landlordId, landlordName: property.landlordName, landlordEmail: property.landlordEmail,
        amount, paymentType, method, status: 'processing', date: serverTimestamp(), notes,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), payment);

      setTimeout(async () => {
        try {
          await updateDoc(doc(db, COLLECTIONS.PAYMENTS, docRef.id), {
            status: 'completed', completedAt: serverTimestamp()
          });
          await this.sendPaymentConfirmation(payment, property, student);
        } catch (error) {
          console.error('Error completing payment:', error);
        }
      }, 2000);

      return { success: true, message: 'Payment is being processed', paymentId: docRef.id };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async getPaymentHistory(limitCount = null) {
    try {
      const userId = getCurrentUserId();
      const user = await getUserData(userId);

      let q = query(collection(db, COLLECTIONS.PAYMENTS),
        where(user.role === ROLES.STUDENT ? 'studentId' : 'landlordId', '==', userId),
        orderBy('date', 'desc'));

      if (limitCount) q = query(q, firestoreLimit(limitCount));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  async getOutstandingBalance(propertyId) {
    try {
      const studentId = getCurrentUserId();
      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      const propertySnap = await getDoc(propertyRef);
      if (!propertySnap.exists()) throw new Error('Property not found');

      const property = propertySnap.data();
      const now = new Date();
      const leaseStart = property.dateAvailable?.toDate() || now;
      const monthsElapsed = Math.max(1, Math.floor((now - leaseStart) / (1000 * 60 * 60 * 24 * 30)));

      const q = query(collection(db, COLLECTIONS.PAYMENTS),
        where('studentId', '==', studentId), where('propertyId', '==', propertyId),
        where('status', '==', 'completed'), where('paymentType', '==', 'rent'));

      const paymentsSnapshot = await getDocs(q);
      const totalPaid = paymentsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      const totalDue = monthsElapsed * property.price;

      return {
        totalDue, totalPaid, outstanding: Math.max(0, totalDue - totalPaid),
        nextDueDate: this.getNextDueDate(), rent: property.price
      };
    } catch (error) {
      console.error('Error calculating balance:', error);
      throw error;
    }
  }

  getNextDueDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }

  async sendPaymentConfirmation(payment, property, student) {
    console.log('Payment confirmation sent to:', student.email);
    console.log('Landlord notification sent to:', property.landlordEmail);
  }
}

// Move Out Management
class MoveOutManager {
  async submitMoveOutNotice(propertyId, moveOutDate, reason = '') {
    if (!moveOutDate) throw new Error('Move out date is required');

    const moveDate = new Date(moveOutDate);
    const today = new Date();
    const noticePeriodDays = Math.floor((moveDate - today) / (1000 * 60 * 60 * 24));
    if (noticePeriodDays < 0) throw new Error('Move out date cannot be in the past');

    try {
      const studentId = getCurrentUserId();
      const student = await getUserData(studentId);
      if (student.role !== ROLES.STUDENT) throw new Error('Only students can submit move-out notices');

      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      const propertySnap = await getDoc(propertyRef);
      if (!propertySnap.exists()) throw new Error('Property not found');

      const property = propertySnap.data();
      const notice = {
        propertyId, propertyTitle: property.title, propertyAddress: property.address,
        studentId, studentName: student.firstName, studentEmail: student.email,
        landlordId: property.landlordId, landlordName: property.landlordName, landlordEmail: property.landlordEmail,
        noticeDate: serverTimestamp(), moveOutDate: moveDate, reason: reason.trim(), noticePeriodDays,
        status: 'pending', inspectionScheduled: false, inspectionDate: null, depositRefundStatus: 'pending'
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.MOVEOUT), notice);
      await this.notifyLandlordMoveOut(property, student, notice);

      return {
        success: true, message: `Move out notice submitted. You will move out on ${moveDate.toLocaleDateString()}`,
        noticeId: docRef.id, warning: noticePeriodDays < 30 ? 'Less than 30 days notice provided' : null
      };
    } catch (error) {
      console.error('Error submitting move out notice:', error);
      throw error;
    }
  }

  async scheduleInspection(noticeId, inspectionDate) {
    try {
      const userId = getCurrentUserId();
      const user = await getUserData(userId);
      if (user.role !== ROLES.LANDLORD) throw new Error('Only landlords can schedule inspections');

      const noticeRef = doc(db, COLLECTIONS.MOVEOUT, noticeId);
      await updateDoc(noticeRef, { inspectionScheduled: true, inspectionDate: new Date(inspectionDate) });

      return { success: true, message: 'Inspection scheduled successfully' };
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      throw error;
    }
  }

  async getCurrentNotice(propertyId = null) {
    try {
      const userId = getCurrentUserId();
      let q = query(collection(db, COLLECTIONS.MOVEOUT), where('studentId', '==', userId),
        where('status', '==', 'pending'), orderBy('noticeDate', 'desc'), firestoreLimit(1));

      if (propertyId) q = query(collection(db, COLLECTIONS.MOVEOUT),
        where('studentId', '==', userId), where('propertyId', '==', propertyId),
        where('status', '==', 'pending'), orderBy('noticeDate', 'desc'), firestoreLimit(1));

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error fetching move out notice:', error);
      throw error;
    }
  }

  calculateDepositRefund(securityFee, damages = 0, cleaningFees = 0, unpaidRent = 0) {
    const deductions = damages + cleaningFees + unpaidRent;
    const refundAmount = Math.max(0, securityFee - deductions);
    return { depositAmount: securityFee, deductions: { damages, cleaning: cleaningFees, unpaidRent, total: deductions }, refundAmount };
  }

  async notifyLandlordMoveOut(property, student, notice) {
    console.log('Move out notification sent to landlord:', property.landlordEmail);
  }
}

// Initialize managers
const maintenanceManager = new MaintenanceManager();
const paymentManager = new PaymentManager();
const moveOutManager = new MoveOutManager();

// Export API
export const propertyManagement = {
  requestMaintenance: async (propertyId, problemType, urgency, description) => 
    await maintenanceManager.createRequest(propertyId, problemType, urgency, description),
  getMaintenanceRequests: async (filter) => await maintenanceManager.getRequests(filter),
  updateMaintenanceStatus: async (requestId, status, notes) => 
    await maintenanceManager.updateRequestStatus(requestId, status, notes),
  payRent: async (propertyId, amount, method, paymentType, notes) => 
    await paymentManager.processPayment(propertyId, amount, method, paymentType, notes),
  getPaymentHistory: async (limit) => await paymentManager.getPaymentHistory(limit),
  getBalance: async (propertyId) => await paymentManager.getOutstandingBalance(propertyId),
  moveOut: async (propertyId, moveOutDate, reason) => 
    await moveOutManager.submitMoveOutNotice(propertyId, moveOutDate, reason),
  scheduleInspection: async (noticeId, date) => await moveOutManager.scheduleInspection(noticeId, date),
  getCurrentMoveOutNotice: async (propertyId) => await moveOutManager.getCurrentNotice(propertyId),
  calculateDepositRefund: (securityFee, damages, cleaningFees, unpaidRent) => 
    moveOutManager.calculateDepositRefund(securityFee, damages, cleaningFees, unpaidRent),
  getPropertyInfo: async (propertyId) => {
    const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
    const snap = await getDoc(propertyRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  getUserInfo: async () => {
    const userId = getCurrentUserId();
    return await getUserData(userId);
  }
};

// HTML Integration Functions
export async function submitRequest(propertyId) {
  const problem = document.getElementById("problemType").value;
  const urgency = document.getElementById("urgency").value;
  const description = document.getElementById("description")?.value || "";

  if (!problem) {
    alert("Please enter the problem type");
    return;
  }

  try {
    const result = await propertyManagement.requestMaintenance(propertyId, problem, urgency, description);
    alert(`${result.message}\nRequest ID: ${result.requestId}`);
    closeModal();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

export async function moveOut(propertyId) {
  const daysUntilMoveOut = 30;
  const moveOutDate = new Date();
  moveOutDate.setDate(moveOutDate.getDate() + daysUntilMoveOut);

  const confirmed = confirm(`Are you sure you want to move out on ${moveOutDate.toLocaleDateString()}?`);

  if (confirmed) {
    try {
      const result = await propertyManagement.moveOut(propertyId, moveOutDate.toISOString().split('T')[0], "End of lease");
      alert(result.message + (result.warning ? `\n\nWarning: ${result.warning}` : ''));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
}

export async function payRentNow(propertyId) {
  try {
    const propertyInfo = await propertyManagement.getPropertyInfo(propertyId);
    const balance = await propertyManagement.getBalance(propertyId);

    const confirmed = confirm(
      `Pay rent for ${propertyInfo.title}?\n\nAmount: P${propertyInfo.price}\nOutstanding Balance: P${balance.outstanding}`
    );

    if (confirmed) {
      const result = await propertyManagement.payRent(propertyId, propertyInfo.price, 'card', 'rent', 'Monthly rent payment');
      alert(`${result.message}\nPayment ID: ${result.paymentId}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

export function openModal() {
  document.getElementById("maintenanceModal").style.display = "flex";
}

export function closeModal() {
  document.getElementById("maintenanceModal").style.display = "none";
  document.getElementById("problemType").value = "";
  document.getElementById("urgency").value = "Medium";
  if (document.getElementById("description")) document.getElementById("description").value = "";
}