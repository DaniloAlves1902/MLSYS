package com.danilo.backend.mlsys.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.danilo.backend.mlsys.exceptions.ProductNotFoundException;
import com.danilo.backend.mlsys.models.Product;
import com.danilo.backend.mlsys.repositories.ProductRepository;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id).orElseThrow(() -> new ProductNotFoundException("Product not found"));
    }

    public Product createProduct(Product product) {
        calculateFees(product);
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, Product product) {
        ensureProductExists(id);
        product.setId(id);
        calculateFees(product);
        return productRepository.save(product);
    }

    public void deleteProduct(Long id) {
        ensureProductExists(id);
        productRepository.deleteById(id);
    }

    private void ensureProductExists(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ProductNotFoundException("Error: product not found with id " + id);
        }
    }

    private void calculateFees(Product product) {
        double originalPrice = product.getGrossSalePrice(); // Preço bruto, R$ 250,00
    
        double fixedFee = originalPrice * 0.03; // 3%
        double premiumFee = product.getPremiumRate() ? originalPrice * 0.19 : 0.0;
        double classicFee = product.getClassicRate() ? originalPrice * 0.14 : 0.0;
        double tax = originalPrice * 0.05; // 5%
        double freight = originalPrice > 78.99 ? 44.0 : 0.0;
        
        // Setar o frete no objeto
        product.setFreight(freight);
    
        double totalDiscounts = fixedFee + premiumFee + classicFee + tax + freight + product.getCost();
    
        double estimatedProfit = originalPrice - totalDiscounts;
    
        // Arredonda para duas casas
        estimatedProfit = Math.round(estimatedProfit * 100.0) / 100.0;
    
        product.setEstimatedGrossProfit(estimatedProfit * product.getQuantity());
    }
    
}