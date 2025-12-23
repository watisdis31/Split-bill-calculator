let items = [];

function format(value) {
  const currency = document.getElementById("currency").value;
  return currency === "IDR"
    ? "Rp " + value.toLocaleString("id-ID")
    : "$" + value.toFixed(2);
}

document.addEventListener("click", function() { //if quantity is empty then reset it to 1
  const qty = itemQty;
  if (!qty.value) {
    qty.value = 1;
  }
});

function getDiscountAmount(itemsTotal) {
  const discountValue = Number(discount.value) || 0;
  const type = discountType.value;

  if (type === "percent") {
    return itemsTotal * (discountValue / 100);
  }
  return discountValue;
}

function updateDiscountUI() {
  const label = document.getElementById("percentLabel");
  label.style.display =
    discountType.value === "percent" ? "block" : "none";
}

updateDiscountUI();
discountType.addEventListener("change", updateDiscountUI);

function addItem() {
  const name = itemName.value.trim();
  const price = Number(itemPrice.value);
  const quantity = itemQty.value;

  if (!name || price <= 0 || !quantity) return; //returns nothing if quantity is empty

  items.push({
    name,
    price,
    quantity, // new quantity key
    isEditing: false,
  });

  itemName.value = "";
  itemPrice.value = "";
  itemQty.value = 1; //sets qty value back to 1

  renderItems();
}

function renderItems() {
  itemList.innerHTML = "";
  yourItems.innerHTML = "";

  let total = 0;

  items.forEach((item, index) => {
    total += item.price * item.quantity; //put * qty here - bran

    // All orders
    if (item.isEditing) { //added new quantity stuffs
      itemList.innerHTML += `
        <li class="list-group-item">
          <input class="form-control bw-input mb-1"
                id="edit-name-${index}"
                value="${item.name}">
          <input type="number"
                class="form-control bw-input mb-2"
                id="edit-price-${index}"
                value="${item.price}">
          <input type="number"
              class="form control bw-input mb-2"
              id="edit-quantity-${index}"
              style="padding-left:15px"
              value="${item.quantity}">
          <button class="bw-btn me-1" onclick="saveItem(${index})">SAVE</button>
          <button class="bw-remove-btn" onclick="removeItem(${index})">✖</button>
        </li>
      `;
    } else {
      itemList.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            ${item.name}
            <small class="d-block text-muted">${format(item.price)}</small>
            <small>qty: ${item.quantity}</small>
          </div>
          <div>
            <button class="bw-edit-btn me-1" onclick="editItem(${index})">✏️</button>
            <button class="bw-remove-btn" onclick="removeItem(${index})">✖</button>
          </div>
        </li>
      `;
    }

    // Your order checklist (only non-editing items)
    if (!item.isEditing) {
      yourItems.innerHTML += `
        <li class="list-group-item">
          <input class="updateCheckbox" type="checkbox"
                data-price="${item.price}"
                onchange="updateYourSubtotal()">
          ${item.name} (${format(item.price)}) <input class="your-quantity" type="number" max="${item.quantity}" min="0" value="0" onchange="updateYourSubtotal()">
        </li>
      `;
    }
  });


  itemsTotal.innerText = `Total: ${format(total)}`;
  updateYourSubtotal();
}

function updateYourSubtotal() {
  let sum = 0;
  document
    .querySelectorAll("#yourItems input:checked")
    .forEach((cb) => {
      let item = cb.closest('.list-group-item');
      let qty = item.querySelector('.your-quantity').value;
      
      (sum += Number(cb.dataset.price) * qty); //ad * qty here too
    });

  yourSubtotal.innerText = `Subtotal: ${format(sum)}`;
}

document.addEventListener('change', () => {
  document
    .querySelectorAll("#yourItems")
    .forEach((l) => {
      let qty = l.querySelector('.your-quantity');
      let checkboxValue = l.querySelector('.updateCheckbox');

      if (checkboxValue === undefined || checkboxValue === null) {
        return;
      }
      if (checkboxValue.checked) {
        qty.min = 1;
        if (qty.value < 1) {
          qty.value = 1;
        }
      }
      else if (!checkboxValue.checked) {
        qty.min = 0;
        qty.value = 0;
      }
  })
})

function calculate() {
  const itemsTotalValue = items.reduce((a, b) => a + b.price, 0);
  if (itemsTotalValue === 0) return;

  const serviceValue = Number(serviceCharge.value) || 0;
  const taxValue = Number(tax.value) || 0;

  let yourSum = 0;
  document
    .querySelectorAll("#yourItems input:checked")
    .forEach((cb) => {
      let perItem = cb.closest('.list-group-item');
      let qty = perItem.querySelector('.your-quantity').value;
      (yourSum += Number(cb.dataset.price) * qty);
    });

  const discountAmount = getDiscountAmount(itemsTotalValue);
  const timing = discountTiming.value;

  let servicePercent, taxPercent;
  let yourDiscountShare, totalPay;

  if (timing === "before") {
    // DISCOUNT BEFORE TAX & SERVICE
    const netSubtotal = itemsTotalValue - discountAmount;

    servicePercent = serviceValue / netSubtotal;
    taxPercent = taxValue / netSubtotal;

    yourDiscountShare =
      (yourSum / itemsTotalValue) * discountAmount;

    const yourNet = yourSum - yourDiscountShare;
    const yourService = yourNet * servicePercent;
    const yourTax = yourNet * taxPercent;

    totalPay = yourNet + yourService + yourTax;
  } else {
    // DISCOUNT AFTER TAX & SERVICE
    servicePercent = serviceValue / itemsTotalValue;
    taxPercent = taxValue / itemsTotalValue;

    const yourService = yourSum * servicePercent;
    const yourTax = yourSum * taxPercent;

    yourDiscountShare =
      (yourSum / itemsTotalValue) * discountAmount;

    totalPay = yourSum + yourService + yourTax - yourDiscountShare;
  }

  result.classList.remove("d-none");
  result.innerHTML = `
    <p>Service: ${(servicePercent * 100).toFixed(2)}%</p>
    <p>Tax: ${(taxPercent * 100).toFixed(2)}%</p>
    <p>Your Discount: -${format(yourDiscountShare)}</p>
    <hr>
    <p>Your Total: <b>${format(totalPay)}</b></p>
  `;
}

function removeItem(index) {
  items.splice(index, 1);
  renderItems();

  // Hide result if data changes
  result.classList.add("d-none");
}

function editItem(index) {
  items[index].isEditing = true;
  renderItems();
}

function saveItem(index) {
  const newName = document.getElementById(`edit-name-${index}`).value.trim();
  const newPrice = Number(document.getElementById(`edit-price-${index}`).value);
  const newQuantity = document.getElementById(`edit-quantity-${index}`).value; //new quantity variable

  if (!newName || newPrice <= 0 || !newQuantity) return;

  items[index].name = newName;
  items[index].price = newPrice;
  items[index].quantity = newQuantity; //set new quantity
  items[index].isEditing = false;

  result.classList.add("d-none");
  renderItems();
}