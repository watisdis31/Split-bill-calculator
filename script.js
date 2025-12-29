// ===== DOM REFERENCES =====
const currencySelect = document.getElementById("currency");
const itemName = document.getElementById("itemName");
const itemPrice = document.getElementById("itemPrice");
const itemQty = document.getElementById("itemQty");
const itemList = document.getElementById("itemList");
const yourItems = document.getElementById("yourItems");
const itemsTotal = document.getElementById("itemsTotal");
const yourSubtotal = document.getElementById("yourSubtotal");
const discount = document.getElementById("discount");
const discountType = document.getElementById("discountType");
const discountTiming = document.getElementById("discountTiming");
const serviceCharge = document.getElementById("serviceCharge");
const tax = document.getElementById("tax");
const percentLabel = document.getElementById("percentLabel");
const result = document.getElementById("result");

// ===== STATE =====
let items = [];

// ===== SHARABLE LINK =====

async function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const billId = params.get("bill");
  if (!billId) return;

  try {
    const doc = await db.collection("bills").doc(billId).get();
    if (!doc.exists) return;

    const data = doc.data();

    currencySelect.value = data.currency;
    items = data.items || [];

    discount.value = data.discount || 0;
    discountType.value = data.discountType || "percent";
    discountTiming.value = data.discountTiming || "before";
    serviceCharge.value = data.serviceCharge || 0;
    tax.value = data.tax || 0;

    updateDiscountUI();
    renderItems();
  } catch (e) {
    console.error("Failed to load bill", e);
  }
}

loadFromURL();

// ===== HELPERS =====
function format(value) {
  return currencySelect.value === "IDR"
    ? "Rp " + value.toLocaleString("id-ID")
    : "$" + value.toFixed(2);
}

function getDiscountAmount(total) {
  const val = Number(discount.value) || 0;
  return discountType.value === "percent" ? total * (val / 100) : val;
}

function updateDiscountUI() {
  percentLabel.style.display =
    discountType.value === "percent" ? "block" : "none";
}

discountType.addEventListener("change", updateDiscountUI);
currencySelect.addEventListener("change", renderItems);
updateDiscountUI();

function generateBillId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ===== SAFARI-SAFE COPY =====
function copyTextSafari(text) {
  const input = document.createElement("input");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, 99999); // iOS fix
  document.execCommand("copy");
  document.body.removeChild(input);
}

function showQRCode(url) {
  const qrBox = document.getElementById("qrWrapper");
  const qrContainer = document.getElementById("qrCode");

  qrContainer.innerHTML = "";
  qrBox.classList.remove("d-none");

  new QRCode(qrContainer, {
    text: url,
    width: 220,
    height: 220,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H, // best for phones
  });
}

// ===== ADD ITEM =====
function addItem() {
  const name = itemName.value.trim();
  const price = Number(itemPrice.value);
  const quantity = Number(itemQty.value);

  if (!name || price <= 0 || quantity <= 0) return;

  items.push({ name, price, quantity, isEditing: false });

  itemName.value = "";
  itemPrice.value = "";
  itemQty.value = 1;

  renderItems();
}

// ===== RENDER =====
function renderItems() {
  itemList.innerHTML = "";
  yourItems.innerHTML = "";

  let total = 0;

  items.forEach((item, i) => {
    total += item.price * item.quantity;

    itemList.innerHTML += item.isEditing
      ? `
      <li class="list-group-item">
        <input class="form-control bw-input mb-1" id="en-${i}" value="${item.name}">
        <input type="number" class="form-control bw-input mb-1" id="ep-${i}" value="${item.price}">
        <input type="number" class="form-control bw-input mb-2" id="eq-${i}" value="${item.quantity}">
        <button class="bw-btn me-1" onclick="saveItem(${i})">SAVE</button>
        <button class="bw-remove-btn" onclick="removeItem(${i})">✖</button>
      </li>`
      : `
      <li class="list-group-item d-flex justify-content-between">
        <div>
          ${item.name}
          <small class="d-block">${format(item.price)} | qty ${item.quantity}</small>
        </div>
        <div>
          <button class="bw-edit-btn me-1" onclick="editItem(${i})">✏️</button>
          <button class="bw-remove-btn" onclick="removeItem(${i})">✖</button>
        </div>
      </li>`;

    if (!item.isEditing) {
      yourItems.innerHTML += `
        <li class="list-group-item">
          <input type="checkbox" data-index="${i}">
          ${item.name} (${format(item.price)})
          <input class="your-quantity" type="number" min="0" max="${item.quantity}" value="0">
        </li>`;
    }
  });

  itemsTotal.innerText = `Total: ${format(total)}`;
  updateYourSubtotal();
}

// ===== YOUR SUBTOTAL =====
yourItems.addEventListener("change", updateYourSubtotal);

function updateYourSubtotal() {
  let sum = 0;

  document.querySelectorAll("#yourItems li").forEach((li) => {
    const cb = li.querySelector("input[type=checkbox]");
    const qtyInput = li.querySelector(".your-quantity");

    if (!cb || !qtyInput) return;

    const index = Number(cb.dataset.index);
    const maxQty = items[index].quantity;

    let qty = Number(qtyInput.value) || 0;

    // Clamp quantity
    if (qty > maxQty) qty = maxQty;
    if (qty < 0) qty = 0;

    qtyInput.value = qty;

    if (cb.checked) {
      // auto-set to 1 if checked
      if (qty === 0) {
        qty = 1;
        qtyInput.value = 1;
      }

      // set to 0 if it's unchecked
      sum += items[index].price * qty;
    } else {
      qtyInput.value = 0;
    }
  });

  yourSubtotal.innerText = `Subtotal: ${format(sum)}`;
}

// ===== CALCULATE =====
function calculate() {
  const total = items.reduce((a, b) => a + b.price * b.quantity, 0);
  if (!total) return;

  const service = Number(serviceCharge.value) || 0;
  const taxVal = Number(tax.value) || 0;

  let yourSum = 0;
  document
    .querySelectorAll("#yourItems input[type=checkbox]:checked")
    .forEach((cb) => {
      const li = cb.closest("li");
      yourSum +=
        items[cb.dataset.index].price *
        Number(li.querySelector(".your-quantity").value);
    });

  const discountAmt = getDiscountAmount(total);
  const timing = discountTiming.value;

  const base = timing === "before" ? Math.max(total - discountAmt, 1) : total;

  const servicePct = service / base;
  const taxPct = taxVal / base;

  const yourDiscount = (yourSum / total) * discountAmt;
  const yourService = yourSum * servicePct;
  const yourTax = yourSum * taxPct;

  const final =
    timing === "before"
      ? yourSum - yourDiscount + yourService + yourTax
      : yourSum + yourService + yourTax - yourDiscount;

  result.classList.remove("d-none");
  result.innerHTML = `
    <p>Service: ${(servicePct * 100).toFixed(2)}%</p>
    <p>Tax: ${(taxPct * 100).toFixed(2)}%</p>
    <p>Your Discount: -${format(yourDiscount)}</p>
    <hr>
    <p><b>Your Total: ${format(final)}</b></p>
  `;
}

// ===== EDIT / REMOVE =====
function removeItem(i) {
  items.splice(i, 1);
  result.classList.add("d-none");
  renderItems();
}

function editItem(i) {
  items[i].isEditing = true;
  renderItems();
}

function saveItem(i) {
  const newName = document.getElementById(`en-${i}`).value.trim();
  const newPrice = Number(document.getElementById(`ep-${i}`).value);
  let newQuantity = Number(document.getElementById(`eq-${i}`).value);

  // QoL FIX: quantity can never be less than 1
  if (newQuantity <= 0 || isNaN(newQuantity)) {
    newQuantity = 1;
  }

  if (!newName || newPrice <= 0) return;

  items[i] = {
    name: newName,
    price: newPrice,
    quantity: newQuantity,
    isEditing: false,
  };

  result.classList.add("d-none");
  renderItems();
}

// Share Bill to Friends
async function shareBill() {
  const billId = generateBillId();

  const data = {
    currency: currencySelect.value,
    items,
    discount: discount.value,
    discountType: discountType.value,
    discountTiming: discountTiming.value,
    serviceCharge: serviceCharge.value,
    tax: tax.value,
    createdAt: Date.now(),
  };

  try {
    // 1️⃣ Save to Firebase
    await db.collection("bills").doc(billId).set(data);

    const url = `${location.origin}${location.pathname}?bill=${billId}`;

    // 2️⃣ Safari-safe copy
    copyTextSafari(url);

    // 3️⃣ Show QR
    showQRCode(url);

    alert("Bill shared! Link copied 📲");
  } catch (e) {
    alert("Failed to share bill");
    console.error(e);
  }
}


// Bill Store
const BILL_STORE_KEY = "bw-bill-store";

function getBillStore() {
  return JSON.parse(localStorage.getItem(BILL_STORE_KEY)) || {};
}

function saveBillToStore(id, data) {
  const store = getBillStore();
  store[id] = data;
  localStorage.setItem(BILL_STORE_KEY, JSON.stringify(store));
}

function loadBillFromStore(id) {
  const store = getBillStore();
  return store[id];
}
