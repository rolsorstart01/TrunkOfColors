import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const artGrid = document.getElementById('art-grid');

// Tracker to manage intervals
const activeTimers = {};

// 2. Timer Logic
function runTimer(id, endTime) {
    if (activeTimers[id]) clearInterval(activeTimers[id]);

    const tick = async () => {
        const timerDisplay = document.getElementById(`timer-${id}`);
        const now = Date.now();
        const distance = endTime - now;

        if (distance <= 0) {
            clearInterval(activeTimers[id]);
            const card = timerDisplay?.closest('.art-card');
            if (card) card.remove();
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (timerDisplay) {
            timerDisplay.innerHTML = `${hours}h ${minutes}m ${seconds}s left`;
        }
    };

    tick();
    activeTimers[id] = setInterval(tick, 1000);
}

// 3. Start Application & Real-time Listener
function startApp() {
    const q = query(
        collection(db, "artworks"),
        where("status", "==", "active")
    );

    onSnapshot(q, (snapshot) => {
        artGrid.innerHTML = '';

        if (snapshot.empty) {
            artGrid.innerHTML = '<p class="courier-prime-regular">No active auctions right now.</p>';
            return;
        }

        const now = Date.now();
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.endTime > now) {
                renderCard(docSnap.id, data);
            }
        });
    });
}

// 4. Render Artwork Cards
function renderCard(id, item) {
    const card = document.createElement('div');
    card.className = 'art-card';

    const buyNowBtn = item.buyPrice
        ? `<button class="buy-btn" data-id="${id}" data-price="${item.buyPrice}" data-title="${item.title}">Instant Buy: ₹${item.buyPrice}</button>`
        : `<p class="auction-only">Auction Only</p>`;

    card.innerHTML = `
        <div class="img-container" onclick="openFullImage('${item.image}')">
            <img src="${item.image}" alt="${item.title}">
            <div class="timer-overlay" id="timer-${id}">Loading...</div>
        </div>
        <div class="art-info">
            <h3 class="courier-prime-bold">${item.title}</h3>
            <div class="bid-status">
                <p>Current Bid: <span class="current-price" id="price-${id}">₹${item.currentBid}</span></p>
                <small>By: ${item.topBidder || 'Initial Price'}</small>
            </div>
            <div class="bid-inputs">
                <input type="text" id="name-${id}" placeholder="Your Name" class="bid-input">
                <input type="text" id="phone-${id}" placeholder="Phone" class="bid-input">
                <input type="number" id="amt-${id}" placeholder="Min. ₹${item.currentBid + 1}" class="bid-input">
                <button class="bid-btn" data-id="${id}" data-current="${item.currentBid}">Place Bid</button>
            </div>
            <hr>
            ${buyNowBtn}
        </div>
    `;
    artGrid.appendChild(card);
    runTimer(id, item.endTime);
}

// 5. Global Click Handlers
document.addEventListener('click', async (e) => {

    // BIDDING LOGIC
    if (e.target.classList.contains('bid-btn')) {
        const id = e.target.getAttribute('data-id');
        const currentBid = parseInt(e.target.getAttribute('data-current'));
        const name = document.getElementById(`name-${id}`).value;
        const phone = document.getElementById(`phone-${id}`).value;
        const amount = parseInt(document.getElementById(`amt-${id}`).value);

        if (!name || !phone || isNaN(amount) || amount <= currentBid) {
            alert("Please fill all fields and bid higher than ₹" + currentBid);
            return;
        }

        try {
            const docRef = doc(db, "artworks", id);
            const docSnap = await getDoc(docRef);
            const currentData = docSnap.data();

            // We must include adminKey to pass the Security Rule: 
            // request.resource.data.adminKey == resource.data.adminKey
            await updateDoc(docRef, {
                currentBid: amount,
                topBidder: name,
                bidderPhone: phone,
                adminKey: currentData.adminKey
            });
            alert("Bid Placed successfully!");
        } catch (err) {
            console.error(err);
            alert("Error: Bid rejected. The auction may have ended.");
        }
    }

    // RAZORPAY LOGIC
    if (e.target.classList.contains('buy-btn')) {
        const id = e.target.getAttribute('data-id');
        const price = e.target.getAttribute('data-price');
        const title = e.target.getAttribute('data-title');

        const options = {
            "key": "rzp_test_YOUR_ACTUAL_KEY", // Replace with your key
            "amount": price * 100,
            "currency": "INR",
            "name": "Trunk Of Colors",
            "description": `Purchase: ${title}`,
            "handler": async function (response) {
                try {
                    const docRef = doc(db, "artworks", id);
                    const docSnap = await getDoc(docRef);
                    const currentData = docSnap.data();

                    await updateDoc(docRef, {
                        status: "sold",
                        paymentId: response.razorpay_payment_id,
                        adminKey: currentData.adminKey // Required to satisfy rules
                    });
                    alert("Payment Successful! Item marked as SOLD.");
                } catch (err) {
                    console.error("Status update failed:", err);
                    alert("Payment successful, but database update failed. Contact Admin.");
                }
            },
            "theme": { "color": "#2d5a27" }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    }
});

// 6. Lightbox
window.openFullImage = (src) => {
    const modal = document.getElementById("imgModal");
    const fullImg = document.getElementById("fullImg");
    if (modal && fullImg) {
        modal.style.display = "flex";
        fullImg.src = src;
    }
};

startApp();
// --- 6. Lightbox & Modal Controls ---

// Function to open the modal
window.openFullImage = (src) => {
    const modal = document.getElementById("imgModal");
    const fullImg = document.getElementById("fullImg");
    if (modal && fullImg) {
        modal.style.display = "flex";
        fullImg.src = src;
        // Prevent background scrolling when image is open
        document.body.style.overflow = "hidden";
    }
};

// Function to close the modal
const closeModal = () => {
    const modal = document.getElementById("imgModal");
    modal.style.display = "none";
    // Re-enable scrolling
    document.body.style.overflow = "auto";
};

// 1. Listen for click on the 'X' button
document.querySelector('.close-modal').addEventListener('click', closeModal);

// 2. Listen for clicks outside the image (on the dark background)
window.addEventListener('click', (event) => {
    const modal = document.getElementById("imgModal");
    if (event.target === modal) {
        closeModal();
    }
});

// 3. Listen for the 'Escape' key
window.addEventListener('keydown', (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
});