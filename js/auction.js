import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 1. Live Query: Only fetch "Active" and "Not Expired" items
function startApp() {
    const now = Date.now();
    const q = query(
        collection(db, "artworks"),
        where("status", "==", "active"),
        where("endTime", ">", now)
    );

    onSnapshot(q, (snapshot) => {
        artGrid.innerHTML = '';

        if (snapshot.empty) {
            artGrid.innerHTML = '<p class="courier-prime-regular">No active auctions right now.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            renderCard(id, item);
        });
    });
}

// 2. Render Artwork Card
function renderCard(id, item) {
    const card = document.createElement('div');
    card.className = 'art-card';

    const buyNowBtn = item.buyPrice
        ? `<button class="buy-btn" data-id="${id}" data-price="${item.buyPrice}">Instant Buy: ₹${item.buyPrice}</button>`
        : `<p class="auction-only">Auction Only</p>`;

    card.innerHTML = `
        <div class="img-container">
            <img src="${item.image}" alt="${item.title}">
            <div class="timer-overlay" id="timer-${id}">Loading...</div>
        </div>
        <div class="art-info">
            <h3 class="courier-prime-bold">${item.title}</h3>
            <div class="bid-status">
                <p>Current Bid: <span class="current-price">₹${item.currentBid}</span></p>
                <small>By: ${item.topBidder || 'Initial Price'}</small>
            </div>
            
            <div class="bid-inputs">
                <input type="text" id="name-${id}" placeholder="Your Name" class="bid-input">
                <input type="text" id="phone-${id}" placeholder="Phone Number" class="bid-input">
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

// 3. Countdown Timer with Auto-Expire
function runTimer(id, endTime) {
    const timerDisplay = document.getElementById(`timer-${id}`);

    const x = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(x);
            // Hide card immediately when expired
            const card = timerDisplay.closest('.art-card');
            if (card) card.style.display = 'none';
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        timerDisplay.innerHTML = `${hours}h ${minutes}m ${seconds}s left`;
    }, 1000);
}

// 4. Handle Clicks
document.addEventListener('click', async (e) => {
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
            await updateDoc(doc(db, "artworks", id), {
                currentBid: amount,
                topBidder: name,
                bidderPhone: phone // Saved for admin to contact
            });
            alert("Bid Placed! We will contact you if you win.");
        } catch (err) {
            alert("Error: Auction may have just ended.");
        }
    }

    if (e.target.classList.contains('buy-btn')) {
        const price = e.target.getAttribute('data-price');
        alert(`Redirecting to payment for ₹${price}...`);
        // Razorpay integration here
    }
});

startApp();