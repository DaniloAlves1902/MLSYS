// API URL
const API_BASE_URL = 'http://localhost:8080/api/products';

// DOM Elements
const productsTableBody = document.getElementById('productsTableBody');
const productModal = document.getElementById('productModal');
const deleteModal = document.getElementById('deleteModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const addProductBtn = document.getElementById('addProductBtn');
const cancelBtn = document.getElementById('cancelBtn');
const alertBox = document.getElementById('alert');
const loading = document.getElementById('loading');
const pagination = document.getElementById('pagination');
const increaseQuantityBtn = document.getElementById('increaseQuantity');
const decreaseQuantityBtn = document.getElementById('decreaseQuantity');
const quantityInput = document.getElementById('quantity');
const totalStockValueElement = document.getElementById('totalStockValue');
const totalProductsElement = document.getElementById('totalProducts');

// Product ID for delete operation
let productToDeleteId = null;

// Current products data
let allProducts = [];
let filteredProducts = [];

// Pagination variables
const itemsPerPage = 10;
let currentPage = 1;

// Previous quantity value for tracking changes
let previousQuantity = 0;

// Event Listeners
document.addEventListener('DOMContentLoaded', fetchProducts);
addProductBtn.addEventListener('click', openAddProductModal);
searchInput.addEventListener('input', handleSearch);
productForm.addEventListener('submit', handleFormSubmit);
cancelBtn.addEventListener('click', closeModal);
document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

// Quantity control buttons
increaseQuantityBtn.addEventListener('click', increaseQuantity);
decreaseQuantityBtn.addEventListener('click', decreaseQuantity);
quantityInput.addEventListener('change', handleQuantityChange);

// Close buttons for modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function () {
        productModal.style.display = 'none';
        deleteModal.style.display = 'none';
    });
});

// Auto calculate estimated gross profit
document.getElementById('grossSalePrice').addEventListener('input', calculateProfit);
document.getElementById('cost').addEventListener('input', calculateProfit);
document.getElementById('premiumRate').addEventListener('change', calculateProfit);
document.getElementById('classicRate').addEventListener('change', calculateProfit);

// Function to update dashboard stats
function updateDashboardStats() {
    // Calculate total stock value
    let totalValue = 0;
    allProducts.forEach(product => {
        // Only count products with both quantity and cost
        if (product.quantity !== null && product.cost !== null) {
            totalValue += product.estimatedGrossProfit;
        }
    });
    
    // Format total value with thousands separator
    const formattedValue = totalValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Update total stock value display
    totalStockValueElement.textContent = `R$ ${formattedValue}`;
    
    // Update total products count
    totalProductsElement.textContent = allProducts.length;
}

// Fetch all products from API
async function fetchProducts() {
    showLoading();
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        allProducts = await response.json();
        filteredProducts = [...allProducts];
        updatePagination();
        renderProducts();
        updateDashboardStats(); // Update dashboard stats after fetching products
        hideLoading();
    } catch (error) {
        showAlert(`Error fetching products: ${error.message}`, 'error');
        hideLoading();
    }
}

// Render products in table
function renderProducts() {
    productsTableBody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

    if (productsToDisplay.length === 0) {
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center;">No products found</td>
            </tr>
        `;
        return;
    }

    productsToDisplay.forEach(product => {
        // Calculate profit for display
        const profit = product.estimatedGrossProfit !== null ? product.estimatedGrossProfit :
            (product.grossSalePrice !== null && product.cost !== null ?
                product.grossSalePrice - product.cost : 0);

        // Determine profit display class
        const profitClass = profit > 0 ? 'profit-positive' : (profit < 0 ? 'profit-negative' : '');

        // Get soldProfit value (default to 0 if not set)
        const soldProfit = product.soldProfit !== null && product.soldProfit !== undefined ? product.soldProfit : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.sku || '-'}</td>
            <td>${product.name || '-'}</td>
            <td class="quantity-cell">
                <button class="btn btn-sm quantity-btn decrease-btn" data-id="${product.id}">-</button>
                <span>${product.quantity !== null ? product.quantity : '0'}</span>
                <button class="btn btn-sm quantity-btn increase-btn" data-id="${product.id}">+</button>
            </td>
            <td>${product.color || '-'}</td>
            <td>${formatVoltage(product.voltage) || '-'}</td>
            <td>R$${product.cost !== null ? product.cost.toFixed(2) : '-'}</td>
            <td>R$${product.grossSalePrice !== null ? product.grossSalePrice.toFixed(2) : '-'}</td>
            <td class="${profitClass}">R$${profit.toFixed(2)}</td>
            <td>R$${soldProfit.toFixed(2)}</td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-sm edit-btn" data-id="${product.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${product.id}">Delete</button>
            </td>
        `;
        productsTableBody.appendChild(row);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditProductModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });

    // Add event listeners to quantity buttons in table
    document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', () => updateProductQuantity(btn.dataset.id, 1));
    });

    document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', () => updateProductQuantity(btn.dataset.id, -1));
    });
}

// Calculate profit per item using the same logic as the backend Java code
function calculateProfitPerItem(product) {
    const originalPrice = product.grossSalePrice || 0;
    const fixedFee = originalPrice * 0.03; // 3%
    const premiumFee = product.premiumRate ? originalPrice * 0.19 : 0.0;
    const classicFee = product.classicRate ? originalPrice * 0.14 : 0.0;
    const tax = originalPrice * 0.05; // 5%
    const freight = originalPrice > 78.99 ? 44.0 : 0.0;

    const totalDiscounts = fixedFee + premiumFee + classicFee + tax + freight + (product.cost || 0);

    // Calculate profit per item
    const profitPerItem = originalPrice - totalDiscounts;

    // Round to two decimal places
    return Math.round(profitPerItem * 100) / 100;
}

// Update product quantity from the table
async function updateProductQuantity(productId, change) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    // Prevent negative quantity
    if (product.quantity + change < 0) {
        showAlert("Quantity cannot be negative", "error");
        return;
    }

    const newQuantity = product.quantity + change;

    // Calculate soldProfit when decreasing quantity (a sale happened)
    let newSoldProfit = product.soldProfit || 0;
    if (change < 0) {
        // When decreasing quantity (selling), calculate profit per item and add to soldProfit
        const profitPerItem = calculateProfitPerItem(product);
        newSoldProfit += profitPerItem * Math.abs(change);
    }

    const updatedProduct = {
        ...product,
        quantity: newQuantity,
        soldProfit: newSoldProfit
    };

    // Update freight based on the new calculation
    updatedProduct.freight = updatedProduct.grossSalePrice > 78.99 ? 44.0 : 0.0;

    // Recalculate estimated gross profit with the new quantity
    const profitPerItem = calculateProfitPerItem(updatedProduct);
    updatedProduct.estimatedGrossProfit = profitPerItem * newQuantity;

    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Update local data
        const updatedProductIndex = allProducts.findIndex(p => p.id == productId);
        allProducts[updatedProductIndex] = updatedProduct;

        const filteredIndex = filteredProducts.findIndex(p => p.id == productId);
        if (filteredIndex !== -1) {
            filteredProducts[filteredIndex] = updatedProduct;
        }

        renderProducts();
        updateDashboardStats(); // Update dashboard stats after quantity change
        hideLoading();
        showAlert(`Quantity ${change > 0 ? 'increased' : 'decreased'} successfully!`, 'success');
    } catch (error) {
        showAlert(`Error updating quantity: ${error.message}`, 'error');
        hideLoading();
    }
}

// Increase quantity in modal
function increaseQuantity() {
    const currentValue = parseInt(quantityInput.value) || 0;
    quantityInput.value = currentValue + 1;
    handleQuantityChange();
}

// Decrease quantity in modal
function decreaseQuantity() {
    const currentValue = parseInt(quantityInput.value) || 0;
    if (currentValue > 0) {
        quantityInput.value = currentValue - 1;
        handleQuantityChange();
    }
}

// Handle quantity change in the form
function handleQuantityChange() {
    const productId = document.getElementById('productId').value;
    if (!productId) {
        previousQuantity = parseInt(quantityInput.value) || 0;
        return; // New product, no need to update soldProfit
    }

    const currentQuantity = parseInt(quantityInput.value) || 0;
    const quantityChange = previousQuantity - currentQuantity;

    // If quantity decreased (sold items), update soldProfit
    if (quantityChange > 0) {
        const product = allProducts.find(p => p.id == productId);
        if (product) {
            const profitPerItem = calculateProfitPerItem(product);

            // Get current soldProfit
            const soldProfitInput = document.getElementById('soldProfit');
            const currentSoldProfit = parseFloat(soldProfitInput.value) || 0;

            // Add profit from sold items
            soldProfitInput.value = (currentSoldProfit + (profitPerItem * quantityChange)).toFixed(2);
        }
    }

    // Update previous quantity
    previousQuantity = currentQuantity;

    // Recalculate estimated gross profit
    calculateProfit();
}

// Format voltage for display
function formatVoltage(voltage) {
    if (!voltage) return '-';

    switch (voltage) {
        case 'V110': return '110V';
        case 'V220': return '220V';
        case 'BIVOLTAL': return 'Bivolt';
        case 'DOES_NOT_APPLY': return 'Não se Aplica';
        default: return voltage;
    }
}

// Handle search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product =>
            (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
            (product.name && product.name.toLowerCase().includes(searchTerm)) ||
            (product.description && product.description.toLowerCase().includes(searchTerm)) ||
            (product.color && product.color.toLowerCase().includes(searchTerm))
        );
    }

    currentPage = 1; // Reset to first page when searching
    updatePagination();
    renderProducts();
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '«';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
            renderProducts();
        }
    });
    pagination.appendChild(prevBtn);

    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.classList.toggle('active', i === currentPage);
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            updatePagination();
            renderProducts();
        });
        pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '»';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
            renderProducts();
        }
    });
    pagination.appendChild(nextBtn);
}

// Open modal to add new product
function openAddProductModal() {
    modalTitle.textContent = 'Add New Product';
    productForm.reset();
    document.getElementById('productId').value = '';
    previousQuantity = 0;
    document.getElementById('soldProfit').value = '0.00';
    productModal.style.display = 'flex';
}

// Open modal to edit existing product
function openEditProductModal(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    modalTitle.textContent = 'Edit Product';

    // Fill form with product data
    document.getElementById('productId').value = product.id;
    document.getElementById('sku').value = product.sku || '';
    document.getElementById('name').value = product.name || '';
    document.getElementById('description').value = product.description || '';
    document.getElementById('quantity').value = product.quantity !== null ? product.quantity : '';
    document.getElementById('color').value = product.color || '';
    document.getElementById('voltage').value = product.voltage || 'V110';
    document.getElementById('cost').value = product.cost !== null ? product.cost : '';
    document.getElementById('grossSalePrice').value = product.grossSalePrice !== null ? product.grossSalePrice : '';
    document.getElementById('estimatedGrossProfit').value = product.estimatedGrossProfit !== null ? product.estimatedGrossProfit : '';
    document.getElementById('soldProfit').value = product.soldProfit !== null ? product.soldProfit : '0';
    document.getElementById('freight').value = product.freight !== null ? product.freight : '';
    document.getElementById('premiumRate').checked = !!product.premiumRate;
    document.getElementById('classicRate').checked = !!product.classicRate;

    // Set previous quantity for tracking changes
    previousQuantity = product.quantity !== null ? product.quantity : 0;

    productModal.style.display = 'flex';
}

// Open delete confirmation modal
function openDeleteModal(productId) {
    productToDeleteId = productId;
    deleteModal.style.display = 'flex';
}

// Handle form submission for create/update
async function handleFormSubmit(event) {
    event.preventDefault();

    const productId = document.getElementById('productId').value;
    const isEdit = !!productId;

    const cost = parseFloat(document.getElementById('cost').value) || 0;
    const grossSalePrice = parseFloat(document.getElementById('grossSalePrice').value) || 0;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    const soldProfit = parseFloat(document.getElementById('soldProfit').value) || 0;
    const premiumRate = document.getElementById('premiumRate').checked;
    const classicRate = document.getElementById('classicRate').checked;

    // Create temporary product object to calculate profit using the backend logic
    const tempProduct = {
        cost: cost,
        grossSalePrice: grossSalePrice,
        premiumRate: premiumRate,
        classicRate: classicRate
    };

    // Calculate profit per item using the same logic as backend
    const profitPerItem = calculateProfitPerItem(tempProduct);

    // Calculate estimated gross profit
    const estimatedGrossProfit = profitPerItem * quantity;

    const productData = {
        id: isEdit ? parseInt(productId) : null,
        sku: document.getElementById('sku').value,
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        quantity: quantity,
        color: document.getElementById('color').value,
        voltage: document.getElementById('voltage').value,
        cost: cost,
        grossSalePrice: grossSalePrice,
        estimatedGrossProfit: estimatedGrossProfit,
        soldProfit: soldProfit,
        freight: grossSalePrice > 78.99 ? 44.0 : 0.0,
        premiumRate: premiumRate,
        classicRate: classicRate
    };

    showLoading();
    try {
        const url = isEdit ? `${API_BASE_URL}/${productId}` : API_BASE_URL;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        closeModal();
        fetchProducts();
        showAlert(`Product ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
    } catch (error) {
        showAlert(`Error ${isEdit ? 'updating' : 'creating'} product: ${error.message}`, 'error');
        hideLoading();
    }
}

// Confirm and execute product deletion
async function confirmDelete() {
    if (!productToDeleteId) return;

    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/${productToDeleteId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        closeDeleteModal();
        fetchProducts();
        showAlert('Product deleted successfully!', 'success');
    } catch (error) {
        showAlert(`Error deleting product: ${error.message}`, 'error');
        hideLoading();
    }
}

// Calculate estimated gross profit automatically
function calculateProfit() {
    const cost = parseFloat(document.getElementById('cost').value) || 0;
    const grossSalePrice = parseFloat(document.getElementById('grossSalePrice').value) || 0;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    const premiumRate = document.getElementById('premiumRate').checked;
    const classicRate = document.getElementById('classicRate').checked;

    // Calculate freight based on sale price
    const freight = grossSalePrice > 78.99 ? 44.0 : 0.0;
    document.getElementById('freight').value = freight.toFixed(2);

    if (grossSalePrice > 0) {
        // Create temporary product object to use with our calculation function
        const tempProduct = {
            cost: cost,
            grossSalePrice: grossSalePrice,
            premiumRate: premiumRate,
            classicRate: classicRate
        };

        // Calculate profit per item using the same logic as the backend
        const profitPerItem = calculateProfitPerItem(tempProduct);

        // Calculate total profit based on quantity
        const totalProfit = profitPerItem * quantity;
        document.getElementById('estimatedGrossProfit').value = totalProfit.toFixed(2);
    }
}

// Close the product modal
function closeModal() {
    productModal.style.display = 'none';
}

// Close the delete confirmation modal
function closeDeleteModal() {
    deleteModal.style.display = 'none';
    productToDeleteId = null;
}

// Show loading spinner
function showLoading() {
    loading.style.display = 'flex';
}

// Hide loading spinner
function hideLoading() {
    loading.style.display = 'none';
}

// Show alert message
function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';

    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}