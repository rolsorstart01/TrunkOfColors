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
    // We trim and convert to String to ensure "TOCAdmin" matches perfectly
    currentAdminKey = String(passInput.value).trim();

    if (currentAdminKey) {
        console.log("Admin logged in. Key captured.");
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
        statusLabel.innerText = "Connecting to Vault...";

        // Calculate end time (Now + hours converted to ms)
        const endTime = Date.now() + (parseInt(duration) * 60 * 60 * 1000);

        // CREATE DOCUMENT
        // adminKey must match the 'passcode' field in /secrets/admin
        await addDoc(collection(db, "artworks"), {
            title: title,
            image: imageUrl,
            buyPrice: buyPrice ? parseInt(buyPrice) : null,
            currentBid: parseInt(startBid),
            endTime: endTime,
            status: "active",
            topBidder: "No bids yet",
            bidderPhone: "N/A",
            adminKey: currentAdminKey,
            timestamp: new Date()
        });

        statusLabel.innerText = "Listing Live!";
        e.target.reset();
    } catch (error) {
        console.error("Firebase Error:", error.code, error.message);
        statusLabel.innerText = "Upload Failed";
        alert("Verification Error: Ensure your password is 'TOCAdmin' and matches the Firestore secret.");
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
    if (!confirm("Mark this artwork as SOLD? This stops all bidding.")) return;

    try {
        const docRef = doc(db, "artworks", id);
        await updateDoc(docRef, {
            status: "sold",
            adminKey: currentAdminKey // Sends password to satisfy Security Rules
        });
        alert("Status updated to SOLD.");
    } catch (error) {
        console.error("Sold Update Error:", error);
        alert("Permission denied. Your session may have expired or the password is wrong.");
    }
};

// --- 5. Delete Artwork ---
window.deleteArt = async (id) => {
    if (!confirm("Permanently delete this artwork?")) return;

    try {
        const docRef = doc(db, "artworks", id);

        // We update the doc with the key before deleting so the 
        // Security Rule "allow delete: if resource.data.adminKey == secret" passes.
        await updateDoc(docRef, {
            adminKey: currentAdminKey
        });

        await deleteDoc(docRef);
        alert("Item deleted successfully.");
    } catch (error) {
        console.error("Delete Error:", error);
        alert("Delete failed. Verification error.");
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
        const title = row.cells[0].innerText.replace(/,/g, "");
        const status = row.cells[1].innerText;
        const price = row.cells[2].innerText.replace("₹", "");

        const bidderText = row.cells[3].innerText;
        const bidderName = bidderText.split('\n')[0].replace("User: ", "").trim();
        const bidderPhone = bidderText.split('\n')[1] ? bidderText.split('\n')[1].replace("Phone: ", "").trim() : "N/A";

        csvContent += `"${title}","${status}","${price}","${bidderName}","${bidderPhone}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TOC_Inventory_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};