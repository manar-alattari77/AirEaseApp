"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualFlightUpdate = exports.updateFlightStatuses = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
// Array of random gates for assignment
const RANDOM_GATES = ['A1', 'B2', 'C3', 'D4', 'E5'];
/**
 * Scheduled Cloud Function that runs every 2 minutes
 * Updates flight statuses according to business logic
 */
exports.updateFlightStatuses = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
    console.log('Starting flight status update process...');
    try {
        // Get all documents from the flights collection
        const flightsSnapshot = await db.collection('flights').get();
        if (flightsSnapshot.empty) {
            console.log('No flights found in the collection.');
            return null;
        }
        console.log(`Found ${flightsSnapshot.size} flights to process.`);
        const batch = db.batch();
        let updateCount = 0;
        // Process each flight document
        for (const doc of flightsSnapshot.docs) {
            const flightData = doc.data();
            const flightId = doc.id;
            console.log(`Processing flight ${flightId}:`, {
                status: flightData.status,
                gate: flightData.gate
            });
            let shouldUpdate = false;
            const updates = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            // Apply business logic based on current status
            switch (flightData.status) {
                case 'scheduled':
                    // scheduled → delayed
                    updates.status = 'delayed';
                    updates.gate = getRandomGate();
                    shouldUpdate = true;
                    console.log(`  → Updating ${flightId} from scheduled to delayed, gate: ${updates.gate}`);
                    break;
                case 'delayed':
                    // delayed → departed
                    updates.status = 'departed';
                    updates.actualDeparture = new Date().toISOString();
                    shouldUpdate = true;
                    console.log(`  → Updating ${flightId} from delayed to departed`);
                    break;
                case 'postponed':
                    // postponed → keep postponing (update gate to TBD)
                    updates.gate = 'TBD';
                    shouldUpdate = true;
                    console.log(`  → Keeping ${flightId} postponed, updating gate to TBD`);
                    break;
                default:
                    console.log(`  → No action needed for ${flightId} (status: ${flightData.status})`);
                    break;
            }
            // Add the update to the batch if needed
            if (shouldUpdate) {
                batch.update(doc.ref, updates);
                updateCount++;
            }
        }
        // Commit all updates in a single batch operation
        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully updated ${updateCount} flights.`);
        }
        else {
            console.log('No flights needed updates.');
        }
        return null;
    }
    catch (error) {
        console.error('Error updating flight statuses:', error);
        throw error;
    }
});
/**
 * Helper function to get a random gate from the predefined list
 * @returns A random gate string
 */
function getRandomGate() {
    const randomIndex = Math.floor(Math.random() * RANDOM_GATES.length);
    return RANDOM_GATES[randomIndex];
}
/**
 * HTTP function to manually trigger flight status updates (for testing)
 */
exports.manualFlightUpdate = functions.https.onRequest(async (req, res) => {
    try {
        console.log('Manual flight update triggered via HTTP');
        // Call the same logic as the scheduled function
        const flightsSnapshot = await db.collection('flights').get();
        if (flightsSnapshot.empty) {
            res.status(200).json({ message: 'No flights found', updated: 0 });
            return;
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
    }
    catch (error) {
        console.error('Error in manual flight update:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//# sourceMappingURL=index.js.map