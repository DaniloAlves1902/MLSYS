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

 // Product ID for delete operation
 let productToDeleteId = null;

 // Current products data
 let allProducts = [];
 let filteredProducts = [];

 // Pagination variables
 const itemsPerPage = 10;
 let currentPage = 1;

 // Event Listeners
 document.addEventListener('DOMContentLoaded', fetchProducts);
 addProductBtn.addEventListener('click', openAddProductModal);
 searchInput.addEventListener('input', handleSearch);
 productForm.addEventListener('submit', handleFormSubmit);
 cancelBtn.addEventListener('click', closeModal);
 document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
 document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

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
                 <td colspan="9" style="text-align: center;">No products found</td>
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

         const row = document.createElement('tr');
         row.innerHTML = `
             <td>${product.sku || '-'}</td>
             <td>${product.name || '-'}</td>
             <td>${product.quantity !== null ? product.quantity : '-'}</td>
             <td>${product.color || '-'}</td>
             <td>${formatVoltage(product.voltage) || '-'}</td>
             <td>$${product.cost !== null ? product.cost.toFixed(2) : '-'}</td>
             <td>$${product.grossSalePrice !== null ? product.grossSalePrice.toFixed(2) : '-'}</td>
             <td class="${profitClass}">$${profit.toFixed(2)}</td>
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
 }

 // Format voltage for display
 function formatVoltage(voltage) {
     if (!voltage) return '-';

     switch (voltage) {
         case 'V110': return '110V';
         case 'V220': return '220V';
         case 'BIVOLTAL': return 'Bivolt';
         case 'DOES_NOT_APPLY': return 'Does not apply';
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
     document.getElementById('freight').value = product.freight !== null ? product.freight : '';
     document.getElementById('premiumRate').checked = !!product.premiumRate;
     document.getElementById('classicRate').checked = !!product.classicRate;

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
     const estimatedGrossProfit = parseFloat(document.getElementById('estimatedGrossProfit').value) || (grossSalePrice - cost);

     const productData = {
         id: isEdit ? parseInt(productId) : null,
         sku: document.getElementById('sku').value,
         name: document.getElementById('name').value,
         description: document.getElementById('description').value,
         quantity: parseInt(document.getElementById('quantity').value) || 0,
         color: document.getElementById('color').value,
         voltage: document.getElementById('voltage').value,
         cost: cost,
         grossSalePrice: grossSalePrice,
         estimatedGrossProfit: estimatedGrossProfit,
         freight: parseFloat(document.getElementById('freight').value) || 0,
         premiumRate: document.getElementById('premiumRate').checked,
         classicRate: document.getElementById('classicRate').checked
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
     const salePrice = parseFloat(document.getElementById('grossSalePrice').value) || 0;

     if (cost > 0 && salePrice > 0) {
         const profit = salePrice - cost;
         document.getElementById('estimatedGrossProfit').value = profit.toFixed(2);
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