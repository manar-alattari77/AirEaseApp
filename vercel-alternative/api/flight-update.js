// Vercel serverless function alternative
// Deploy to Vercel for free and use with cron-job.org

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "aireaseapp-78",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const RANDOM_GATES = ['A1', 'B2', 'C3', 'D4', 'E5'];

function getRandomGate() {
  const randomIndex = Math.floor(Math.random() * RANDOM_GATES.length);
  return RANDOM_GATES[randomIndex];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Flight update triggered via Vercel');
    
    const flightsSnapshot = await db.collection('flights').get();
    
    if (flightsSnapshot.empty) {
      return res.status(200).json({ message: 'No flights found', updated: 0 });
    }

    const batch = db.batch();
    let updateCount = 0;

    for (const doc of flightsSnapshot.docs) {
      const flightData = doc.data();
      
      let shouldUpdate = false;
      const updates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      switch (flightData.status) {
        case 'scheduled':
          updates.status = 'delayed';
          updates.gate = getRandomGate();
          shouldUpdate = true;
          break;
        case 'delayed':
          updates.status = 'departed';
          updates.actualDeparture = new Date().toISOString();
          shouldUpdate = true;
          break;
        case 'postponed':
          updates.gate = 'TBD';
          shouldUpdate = true;
          break;
      }

      if (shouldUpdate) {
        batch.update(doc.ref, updates);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
    }

    res.status(200).json({ 
      message: 'Flight updates completed', 
      updated: updateCount,
      total: flightsSnapshot.size 
    });
  } catch (error) {
    console.error('Error in flight update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
