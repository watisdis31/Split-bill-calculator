let items = [];

function format(value) {
  const currency = document.getElementById("currency").value;
  return currency === "IDR"
    ? "Rp " + value.toLocaleString("id-ID")
    : "$" + value.toFixed(2);
}

function addItem() {
  const name = itemName.value.trim();
  const price = Number(itemPrice.value);

  if (!name || price <= 0) return;

  items.push({
    name,
    price,
    isEditing: false,
  });

  itemName.value = "";
  itemPrice.value = "";

  renderItems();
}

function renderItems() {
  itemList.innerHTML = "";
  yourItems.innerHTML = "";

  let total = 0;

  items.forEach((item, index) => {
    total += item.price;

    // All orders
    if (item.isEditing) {
      itemList.innerHTML += `
        <li class="list-group-item">
          <input class="form-control bw-input mb-1"
                 id="edit-name-${index}"
                 value="${item.name}">
          <input type="number"
                 class="form-control bw-input mb-2"
                 id="edit-price-${index}"
                 value="${item.price}">
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
          <input type="checkbox"
                 data-price="${item.price}"
                 onchange="updateYourSubtotal()">
          ${item.name} (${format(item.price)})
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
    .forEach((cb) => (sum += Number(cb.dataset.price)));

  yourSubtotal.innerText = `Subtotal: ${format(sum)}`;
}

function calculate() {
  const itemsTotalValue = items.reduce((a, b) => a + b.price, 0);
  const service = Number(serviceCharge.value);
  const taxValue = Number(tax.value);

  let yourSum = 0;
  document
    .querySelectorAll("#yourItems input:checked")
    .forEach((cb) => (yourSum += Number(cb.dataset.price)));

  const servicePercent = service / itemsTotalValue;
  const taxPercent = taxValue / itemsTotalValue;

  const yourService = yourSum * servicePercent;
  const yourTax = yourSum * taxPercent;
  const totalPay = yourSum + yourService + yourTax;

  result.classList.remove("d-none");
  result.innerHTML = `
    <p>Service: ${(servicePercent * 100).toFixed(2)}%</p>
    <p>Tax: ${(taxPercent * 100).toFixed(2)}%</p>
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

  if (!newName || newPrice <= 0) return;

  items[index].name = newName;
  items[index].price = newPrice;
  items[index].isEditing = false;

  result.classList.add("d-none");
  renderItems();
}