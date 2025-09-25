import admin from "firebase-admin";

// Progressive flight status mapping (case-insensitive)
const nextStatusMap: Record<string, string> = {
  scheduled: "Boarding",
  boarding: "Departed",
  delayed: "Departed",
  departed: "Arrived",
  arrived: "Scheduled", // Reset loop: Arrived → Scheduled
};

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    console.log("🔧 Starting Firebase Admin initialization...");
    
    // Check environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error("❌ Missing environment variables:");
      console.error("FIREBASE_PROJECT_ID:", !!process.env.FIREBASE_PROJECT_ID);
      console.error("FIREBASE_CLIENT_EMAIL:", !!process.env.FIREBASE_CLIENT_EMAIL);
      console.error("FIREBASE_PRIVATE_KEY:", !!process.env.FIREBASE_PRIVATE_KEY);
      throw new Error("Missing required environment variables");
    }

    console.log("✅ Environment variables found");

    // Process private key
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    console.log("✅ Private key processed");

    // Safely check if Firebase is already initialized
    const appsLength = admin.apps && admin.apps.length !== undefined ? admin.apps.length : 0;
    
    if (appsLength === 0) {
      console.log("🔧 Initializing Firebase Admin SDK...");
      
      // Check if admin.credential exists before using it
      if (!admin.credential || !admin.credential.cert) {
        console.error("❌ admin.credential is undefined or missing cert method");
        throw new Error("Firebase Admin credential is not available");
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log("✅ Firebase Admin SDK initialized successfully");
    } else {
      console.log("✅ Firebase Admin SDK already initialized");
    }

    return true;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    if (error instanceof Error) {
      console.error("❌ Error details:", error.message);
    }
    throw error;
  }
}

export default async function handler(req: any, res: any) {
  try {
    console.log("🚀 Flight update function started");
    
    // Initialize Firebase
    initializeFirebase();
    
    const db = admin.firestore();
    
    // Get all flights from Firestore
    console.log("📋 Fetching all flights from Firestore...");
    const flightsSnapshot = await db.collection('flights').get();
    
    if (flightsSnapshot.empty) {
      console.log("ℹ️ No flights found to update");
      return res.status(200).json({ 
        success: true, 
        message: "No flights found to update",
        updated: 0,
        total: 0,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📊 Found ${flightsSnapshot.size} flights to process`);

    // Convert to array and sort by updatedAt (oldest first)
    const flights = flightsSnapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data()
    }));

    // Sort by updatedAt (oldest first)
    flights.sort((a, b) => {
      const aTime = a.data.updatedAt?.toDate ? a.data.updatedAt.toDate() : new Date(a.data.updatedAt || 0);
      const bTime = b.data.updatedAt?.toDate ? b.data.updatedAt.toDate() : new Date(b.data.updatedAt || 0);
      return aTime.getTime() - bTime.getTime();
    });

    console.log(`📅 Sorted flights by updatedAt (oldest first)`);

    // Pick only the first flight (oldest)
    const flightToUpdate = flights[0];
    const flightData = flightToUpdate.data;
    const currentStatus = flightData.status;
    
    console.log(`🎯 Selected flight: ${flightData.flightNumber || flightToUpdate.id} (${currentStatus})`);
    
    // Normalize the status to lowercase for case-insensitive matching
    const normalizedStatus = (currentStatus || "").toLowerCase();
    const nextFlightStatus = nextStatusMap[normalizedStatus];

    if (nextFlightStatus && nextFlightStatus !== currentStatus) {
      console.log(`✈️ Updating flight ${flightData.flightNumber || flightToUpdate.id}: ${currentStatus} → ${nextFlightStatus}`);
      
      const updates: any = {
        status: nextFlightStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // If status changes to Departed, set actualDeparture
      if (nextFlightStatus === "Departed") {
        updates.actualDeparture = new Date().toISOString();
        console.log(`🛫 Flight ${flightData.flightNumber || flightToUpdate.id}: Set actual departure time`);
      }

      // Update the single flight
      await flightToUpdate.ref.update(updates);
      console.log(`✅ Successfully updated flight ${flightData.flightNumber || flightToUpdate.id}`);

      res.status(200).json({ 
        success: true, 
        message: "Flight update completed successfully",
        updated: 1,
        total: flightsSnapshot.size,
        flightUpdated: flightData.flightNumber || flightToUpdate.id,
        statusChange: `${currentStatus} → ${nextFlightStatus}`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`ℹ️ Flight ${flightData.flightNumber || flightToUpdate.id}: Status '${currentStatus}' - no update needed`);
      
      res.status(200).json({ 
        success: true, 
        message: "No flight needed update",
        updated: 0,
        total: flightsSnapshot.size,
        flightChecked: flightData.flightNumber || flightToUpdate.id,
        currentStatus: currentStatus,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("❌ Function error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Function execution failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
}
