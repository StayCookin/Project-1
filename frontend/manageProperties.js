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

const COLLECTIONS = {
    PROPERTIES: 'properties' ,
    USERS: 'users' ,
    MAINTENANCE: 'maintenanceRequests' ,
    PAYMENTS: 'payments' ,
    MOVEOUT: 'moveOutNotices',
    BOOKINGS: 'bookings'
};

const ROLES = {
    STUDENT: 'STUDENT' ,
    LANDLORD: 'LANDLORD'
};
function getCurrentUserId() {
    const user = auth.currentUser;
    if(!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
}

async function getUserData(userId) {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error(' User not found');
        }
        return { id: userSnap.id, ...userSnap.data() };
}

class maintenanceManager {
    async createRequest(studentId, propertyId, problemType, urgency, description = '') {
        if (!problemType || !urgency) {
            throw new Error(" Problem type and urgency are required");
        }
try {
    const studentId = getCurrentUserId();
    const student = await getUserData(studentId);

    if(student.role != ROLES.STUDENT) {
        throw new Error('Only students have can create maintanence requests');
    }

            const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
            const propertySnap = await getDoc(propertyRef);

            if (!propertySnap.exists()) {
                throw new Error('Property not found');
            }

            const property = propertySnap.data();

            const request = {
                propertyId: propertyId,
                ropertyTitle: property.title,
        propertyAddress: property.address,
        studentId: studentId,
        studentName: student.firstName,
        studentEmail: student.email,
        landlordId: property.landlordId,
        landlordName: property.landlordName,
        landlordEmail: property.landlordEmail,
        problemType: problemType.trim(),
        urgency: urgency,
        description: description.trim(),
        status: 'pending',
        dateCreated: serverTimestamp(),
        dateResolved: null,
        assignedTo: null,
        notes: []
            };
        }
    }
}