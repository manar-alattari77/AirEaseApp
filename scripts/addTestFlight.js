// Script to add a test flight document to Firestore
// Run this with: node scripts/addTestFlight.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDehWYu3HWGdZCQDaEiInLK-AwwGbada0g",
  authDomain: "aireaseapp-78.firebaseapp.com",
  projectId: "aireaseapp-78",
  storageBucket: "aireaseapp-78.firebasestorage.app",
  messagingSenderId: "944822283741",
  appId: "1:944822283741:web:2f6ad53cd1c234753c9a34",
  measurementId: "G-B4HHYJ4TWR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestFlight() {
  try {
    const flightId = 'RJ112-2025-09-20';
    const flightData = {
      flightNumber: 'RJ112',
      date: '2025-09-20',
      status: 'scheduled',
      gate: 'B12',
      terminal: 'T2',
      scheduledDeparture: '2025-09-20T14:30:00Z',
      actualDeparture: null,
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'flights', flightId), flightData);
    console.log('✅ Test flight document added successfully!');
    console.log('Document ID:', flightId);
    console.log('Flight data:', flightData);
    console.log('\n📱 Now test the app:');
    console.log('1. Enter flight number: RJ112');
    console.log('2. Enter date: 2025-09-20');
    console.log('3. Click "Subscribe to Flight"');
    console.log('4. Update the document in Firebase Console to see real-time changes!');
  } catch (error) {
    console.error('❌ Error adding test flight:', error);
  }
}

addTestFlight();
