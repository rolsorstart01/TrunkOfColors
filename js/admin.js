import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBq1HMa_3JcLp2sAJgmSTrTKORyDzoSjvU",
    authDomain: "trunkofcolors-f4864.firebaseapp.com",
    projectId: "trunkofcolors-f4864",
    storageBucket: "trunkofcolors-f4864.firebasestorage.app",
    messagingSenderId: "1082694729533",
    appId: "1:1082694729533:web:ace956cb5b24656e338f54",
    measurementId: "G-1V0C8RNCD6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentAdminKey = "";

// Login Gate
window.checkPass = () => {
    currentAdminKey = document.getElementById('admin-pass').value;
    // UI logic to show the dashboard
    document.getElementById('admin-gate').style.display = "none";
    document.getElementById('admin-content').style.display = "block";
    loadInventory();
};

// Add Listing (Using URL instead of File Upload)
document.getElementById('add-art-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const status = document.getElementById('upload-status');

    // Get values from the form
    const title = document.getElementById('art-title').value;
    const imageUrl = document.getElementById('art-image-url').value; // Changed to URL input
    const buyPrice = document.getElementById('art-buy-price').value;
    const startBid = document.getElementById('art-start-bid').value;
    const duration = document.getElementById('auction-duration').value;

    try {
        submitBtn.disabled = true;
        status.innerText = "Saving to database...";

        // Calculate End Time (Current time + duration in hours)
        const endTime = Date.now() + (parseInt(duration) * 60 * 60 * 1000);

        // Save Data to Firestore
        const newArt = {
            title: title,
            image: imageUrl,
            buyPrice: buyPrice ? parseInt(buyPrice) : null, // Optional Buy Now
            currentBid: parseInt(startBid),
            endTime: endTime,
            status: "active",
            topBidder: "No bids yet",
            adminKey: currentAdminKey, // Security rule validation
            timestamp: new Date()
        };

        await addDoc(collection(db, "artworks"), newArt);

        status.innerText = "Listing Live!";
        status.style.color = "green";
        e.target.reset();
    } catch (error) {
        status.innerText = "Error: Permission Denied. Check password.";
        status.style.color = "red";
        console.error(error);
    } finally {
        submitBtn.disabled = false;
    }
});

// Load and Manage Inventory in Real-time
function loadInventory() {
    onSnapshot(collection(db, "artworks"), (snapshot) => {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${item.title}</td>
                <td class="status-${item.status}">${item.status.toUpperCase()}</td>
                <td>₹${item.currentBid}</td>
                <td>
                    <button class="sold-btn" onclick="markSold('${id}')">Mark Sold</button>
                    <button class="del-btn" onclick="deleteArt('${id}')">Delete</button>
                </td>
            `;
            list.appendChild(row);
        });
    });
}

// Global function to mark as SOLD
window.markSold = async (id) => {
    if (confirm("Mark this as SOLD? It will be removed from the gallery public view.")) {
        try {
            const artRef = doc(db, "artworks", id);
            await updateDoc(artRef, {
                status: "sold",
                adminKey: currentAdminKey
            });
        } catch (error) {
            alert("Error: You might have the wrong password.");
        }
    }
};

// Global function to DELETE
window.deleteArt = async (id) => {
    if (confirm("Permanently delete this listing?")) {
        try {
            // Note: Since delete doesn't allow sending data in the body easily,
            // ensure your Firestore rules allow this based on the headers or simplified rules.
            await deleteDoc(doc(db, "artworks", id));
        } catch (error) {
            alert("Error deleting: Check permissions.");
        }
    }
};
// Add this helper for deletion in admin.js
window.deleteArt = async (id) => {
    if (confirm("Are you sure you want to delete this listing permanently?")) {
        try {
            const artRef = doc(db, "artworks", id);
            // In a 'no-auth' system, we usually update the doc with the key 
            // before deleting, or use a specific delete field.
            // For simplicity, we will just delete here. 
            // If your rules block it, ensure the 'delete' rule is 'allow delete: if true'
            // while you are the only one with the URL.
            await deleteDoc(artRef);
            alert("Deleted successfully.");
        } catch (error) {
            console.error(error);
            alert("Delete failed. Check console.");
        }
    }
};