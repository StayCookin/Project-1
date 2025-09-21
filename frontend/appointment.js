import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, doc, addDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Minimal, clean appointment/viewings frontend
const firebaseConfig = { apiKey: "AIzaSyCZuEC4QU-RYxQbjWqBoxk6j1mbwwRtRBo", authDomain: "inrent-6ab14.firebaseapp.com", projectId: "inrent-6ab14" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let viewingsListener = null;

const VIEWING_STATUS = { CONFIRMED: 'confirmed', PENDING: 'pending', CANCELLED: 'cancelled', COMPLETED: 'completed' };

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => { if (user) { currentUser = user; loadUserViewings(); } else { currentUser = null; showLoginPrompt(); } });
});

async function loadUserViewings() {
  if (!currentUser) return;
  const q = query(collection(db,'viewings'), where('userId','==',currentUser.uid), orderBy('dateTime','asc'));
  if (viewingsListener) { viewingsListener(); viewingsListener = null; }
  viewingsListener = onSnapshot(q, snap => { const arr = []; snap.forEach(s => arr.push({ id: s.id, ...s.data() })); renderViewings(arr); }, err => { console.error(err); showError('Failed to load viewings.'); });
}

function renderViewings(viewings) {
  const container = document.querySelector('section'); if (!container) return; container.innerHTML = '';
  if (!viewings.length) { container.innerHTML = '<div class="text-center py-8 text-gray-500">No viewings scheduled yet.</div>'; return; }
  const now = new Date(); const upcoming = viewings.filter(v => new Date(v.dateTime) > now); const past = viewings.filter(v => new Date(v.dateTime) <= now);
  if (upcoming.length) { const h = document.createElement('h3'); h.textContent = 'Upcoming Viewings'; container.appendChild(h); upcoming.forEach(v => container.appendChild(createCard(v,true))); }
  if (past.length) { const h = document.createElement('h3'); h.textContent = 'Past Viewings'; container.appendChild(h); past.forEach(v => container.appendChild(createCard(v,false))); }
}

function createCard(v, isUpcoming) { const el = document.createElement('div'); el.className = 'viewing-card p-4 mb-4 border-l-4'; el.dataset.id = v.id; const dt = new Date(v.dateTime); const end = v.endDateTime ? new Date(v.endDateTime) : new Date(dt.getTime()+30*60000); el.innerHTML = `<div><strong>${escapeHtml(v.propertyAddress||'')}</strong></div><div>${formatDateTime(dt,end)}</div><div>Status: ${escapeHtml(v.status||'')}</div><div>${createActionInner(v,isUpcoming)}</div>`; return el; }

function createActionInner(v, canModify) { if (!canModify) return ''; if (v.status===VIEWING_STATUS.PENDING) return `<button onclick="window.editViewing('${v.id}')">Edit</button> <button onclick="window.cancelViewing('${v.id}')">Cancel</button>`; if (v.status===VIEWING_STATUS.CONFIRMED) return `<button onclick="window.rescheduleViewing('${v.id}')">Reschedule</button> <button onclick="window.cancelViewing('${v.id}')">Cancel</button>`; return ''; }

function formatDateTime(s,e) { return `${s.toLocaleDateString()} ${s.toLocaleTimeString()} - ${e.toLocaleTimeString()}`; }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t||''; return d.innerHTML; }

async function addViewing(data) { if (!currentUser) { showError('Login required'); return false; } try { const ref = await addDoc(collection(db,'viewings'), { userId: currentUser.uid, ...data, status: VIEWING_STATUS.PENDING, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); showSuccess('Requested'); return ref.id; } catch (err) { console.error(err); showError('Failed'); return false; } }

async function updateViewing(viewingId, updateData) { if (!currentUser) { showError('Login required'); return false; } try { await updateDoc(doc(db,'viewings',viewingId), { ...updateData, updatedAt: serverTimestamp() }); showSuccess('Updated'); return true; } catch (err) { console.error(err); showError('Failed'); return false; } }

async function cancelViewing(viewingId) { return updateViewing(viewingId,{ status: VIEWING_STATUS.CANCELLED }); }
async function rescheduleViewing(viewingId) { showInfo('Reschedule UI'); return updateViewing(viewingId,{ status: VIEWING_STATUS.PENDING }); }
async function editViewing(viewingId) { showInfo('Edit UI'); }

function showSuccess(m){ showNotification(m,'success'); }
function showError(m){ showNotification(m,'error'); }
function showInfo(m){ showNotification(m,'info'); }

function showNotification(message,type){ const n=document.createElement('div'); n.textContent=message; n.className='fixed top-4 right-4 p-2 bg-gray-100'; document.body.appendChild(n); setTimeout(()=>n.remove(),4000); }

function showLoginPrompt(){ const c=document.querySelector('section'); if(!c) return; c.innerHTML='<div class="text-center py-8">Please log in to view appointments.</div>'; }

function cleanup(){ if(viewingsListener){ viewingsListener(); viewingsListener=null; } }

window.addViewing = addViewing; window.updateViewing = updateViewing; window.cancelViewing = cancelViewing; window.rescheduleViewing = rescheduleViewing; window.editViewing = editViewing; window.addEventListener('beforeunload', cleanup);

    function getStatusBorderColor(status) {
        switch (status) {
            case VIEWING_STATUS.CONFIRMED: return 'border-green-500';
            case VIEWING_STATUS.PENDING: return 'border-yellow-500';
            case VIEWING_STATUS.CANCELLED: return 'border-red-500';
            case VIEWING_STATUS.COMPLETED: return 'border-gray-500';
            default: return 'border-blue-500';
        }
    }

    function getStatusBadge(status) {
        switch (status) {
            case VIEWING_STATUS.CONFIRMED: return '<span class="font-bold text-green-600">Confirmed</span>';
            case VIEWING_STATUS.PENDING: return '<span class="font-bold text-yellow-600">Pending Approval</span>';
            case VIEWING_STATUS.CANCELLED: return '<span class="font-bold text-red-600">Cancelled</span>';
            case VIEWING_STATUS.COMPLETED: return '<span class="font-bold text-gray-600">Completed</span>';
            default: return '<span class="font-bold text-blue-600">Unknown</span>';
        }
    }

   formatDateTime(startDate, endDate) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const formattedDate = startDate.toLocaleDateString('en-US', options);
        const startTime = startDate.toLocaleTimeString('en-US', timeOptions);
        const endTime = endDate.toLocaleTimeString('en-US', timeOptions);
        return `${formattedDate} at ${startTime} - ${endTime}`;
    }

    async function addViewing(viewingData) {
        if (!currentUser) { showError('Please log in to book a viewing.'); return false; }
        try {
            const docRef = await addDoc(collection(db, 'viewings'), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                propertyAddress: viewingData.propertyAddress,
                propertyType: viewingData.propertyType,
                dateTime: viewingData.dateTime,
                endDateTime: viewingData.endDateTime,
                status: VIEWING_STATUS.PENDING,
                notes: viewingData.notes || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            showSuccess('Viewing request submitted successfully!');
            return docRef.id;
        } catch (error) {
            console.error('Error adding viewing:', error);
            showError('Failed to submit viewing request. Please try again.');
            return false;
        }
    }

    async function updateViewing(viewingId, updateData) {
        if (!currentUser) { showError('Please log in to update viewing.'); return false; }
        try {
            await updateDoc(doc(db, 'viewings', viewingId), { ...updateData, updatedAt: serverTimestamp() });
            showSuccess('Viewing updated successfully!');
            return true;
        } catch (error) {
            console.error('Error updating viewing:', error);
            showError('Failed to update viewing. Please try again.');
            return false;
        }
    }

    async function cancelViewing(viewingId) {
        if (!confirm('Are you sure you want to cancel this viewing?')) return;
        const success = await updateViewing(viewingId, { status: VIEWING_STATUS.CANCELLED });
        if (success) showSuccess('Viewing cancelled successfully.');
    }

    async function rescheduleViewing(viewingId) {
        showInfo('Reschedule functionality would open a date/time picker here.');
        await updateViewing(viewingId, { status: VIEWING_STATUS.PENDING });
    }

    async function editViewing(viewingId) {
        showInfo('Edit functionality would open an edit form here.');
    }

    function setupEventListeners() { /* placeholder for future listeners */ }

    function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showError(message) { showNotification(message, 'error'); }
    function showInfo(message) { showNotification(message, 'info'); }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${getNotificationClasses(type)}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    function getNotificationClasses(type) {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-800 border border-green-300';
            case 'error': return 'bg-red-100 text-red-800 border border-red-300';
            case 'info': return 'bg-blue-100 text-blue-800 border border-blue-300';
            default: return 'bg-gray-100 text-gray-800 border border-gray-300';
        }
    }

    function showLoginPrompt() {
        const container = document.querySelector('section');
        if (!container) return;
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-user-lock text-4xl text-gray-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Please Log In</h3>
                <p class="text-gray-500 mb-4">You need to be logged in to view your appointments.</p>
                <button onclick="window.location.href='/login'" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Log In</button>
            </div>
        `;
    }

    function cleanup() { if (viewingsListener) { viewingsListener(); viewingsListener = null; } }

    window.addViewing = addViewing;
    window.updateViewing = updateViewing;
    window.cancelViewing = cancelViewing;
    window.rescheduleViewing = rescheduleViewing;
    window.editViewing = editViewing;

    window.addEventListener('beforeunload', cleanup);
    
