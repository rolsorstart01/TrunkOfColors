import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Firebase Configuration
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

// --- 1. Handle Login ---
window.checkPass = () => {
    const passInput = document.getElementById('admin-pass');
    currentAdminKey = passInput.value;

    if (currentAdminKey) {
        document.getElementById('admin-gate').style.display = "none";
        document.getElementById('admin-content').style.display = "block";
        loadInventory();
    } else {
        alert("Please enter the admin password.");
    }
};

// --- 2. Add New Artwork ---
document.getElementById('add-art-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const statusLabel = document.getElementById('upload-status');

    const title = document.getElementById('art-title').value;
    const imageUrl = document.getElementById('art-image-url').value;
    const buyPrice = document.getElementById('art-buy-price').value;
    const startBid = document.getElementById('art-start-bid').value;
    const duration = document.getElementById('auction-duration').value;

    try {
        submitBtn.disabled = true;
        statusLabel.innerText = "Processing...";

        // Calculate end time (Now + hours)
        const endTime = Date.now() + (parseInt(duration) * 60 * 60 * 1000);

        await addDoc(collection(db, "artworks"), {
            title,
            image: imageUrl,
            buyPrice: buyPrice ? parseInt(buyPrice) : null,
            currentBid: parseInt(startBid),
            endTime,
            status: "active",
            topBidder: "No bids yet",
            bidderPhone: "N/A",
            adminKey: currentAdminKey, // Matches Security Rule: allow create
            timestamp: new Date()
        });

        statusLabel.innerText = "Listing Live!";
        e.target.reset();
    } catch (error) {
        console.error(error);
        statusLabel.innerText = "Error: Check Password/Connection";
        alert("Upload failed. Verify your passcode matches the database secret.");
    } finally {
        submitBtn.disabled = false;
    }
});

// --- 3. Load Inventory (Real-Time) ---
function loadInventory() {
    onSnapshot(collection(db, "artworks"), (snapshot) => {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement('tr');

            // Using class names that match your admin.css
            row.innerHTML = `
                <td><strong>${item.title}</strong></td>
                <td><span class="status-${item.status}">${item.status.toUpperCase()}</span></td>
                <td>₹${item.currentBid}</td>
                <td>
                    <div class="bidder-details">
                        <strong>User:</strong> ${item.topBidder}<br>
                        <strong>Phone:</strong> ${item.bidderPhone || 'N/A'}
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        ${item.status === 'active' ? `<button class="sold-btn" onclick="markSold('${id}')">Mark Sold</button>` : ''}
                        <button class="delete-btn" onclick="deleteArt('${id}')">Delete</button>
                    </div>
                </td>
            `;
            list.appendChild(row);
        });
    });
}

// --- 4. Mark Item as Sold ---
window.markSold = async (id) => {
    if (confirm("Mark this artwork as SOLD? This stops all bidding.")) {
        try {
            const docRef = doc(db, "artworks", id);
            // adminKey triggers 'Option A' in your Security Rules
            await updateDoc(docRef, {
                status: "sold",
                adminKey: currentAdminKey
            });
            alert("Updated to SOLD.");
        } catch (error) {
            console.error(error);
            alert("Update failed. Password might be incorrect.");
        }
    }
};

// --- 5. Delete Artwork ---
window.deleteArt = async (id) => {
    if (confirm("Permanently delete this artwork?")) {
        try {
            const docRef = doc(db, "artworks", id);

            // Prove identity first (Matches Security Rule: allow delete)
            await updateDoc(docRef, {
                adminKey: currentAdminKey
            });

            await deleteDoc(docRef);
            alert("Deleted successfully.");
        } catch (error) {
            console.error("Delete error:", error);
            alert("Delete failed. Permission denied.");
        }
    }
};

// --- 6. Export to CSV (Excel) ---
window.exportToCSV = () => {
    const rows = document.querySelectorAll("#inventory-list tr");
    if (rows.length === 0) {
        alert("No data to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Title,Status,Price,Bidder,Phone\n";

    rows.forEach(row => {
        const title = row.cells[0].innerText;
        const status = row.cells[1].innerText;
        const price = row.cells[2].innerText.replace("₹", "");

        // Extract Name and Phone from the bidder-details div
        const bidderText = row.cells[3].innerText;
        const bidderName = bidderText.split('\n')[0].replace("User: ", "").trim();
        const bidderPhone = bidderText.split('\n')[1] ? bidderText.split('\n')[1].replace("Phone: ", "").trim() : "N/A";

        csvContent += `"${title}","${status}","${price}","${bidderName}","${bidderPhone}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TOC_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};