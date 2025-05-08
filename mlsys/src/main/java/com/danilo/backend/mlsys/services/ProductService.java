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

    public Product createProduct(Product product, double freight) {
        calculateFees(product, freight);
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, Product product, double freight) {
        ensureProductExists(id);
        product.setId(id);
        calculateFees(product, freight);
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

    private void calculateFees(Product product, double freight) {
        double originalPrice = product.getGrossSalePrice();
    
        double fixedFee = originalPrice * 0.03;
        double premiumFee = product.getPremiumRate() ? originalPrice * 0.19 : 0.0;
        double classicFee = product.getClassicRate() ? originalPrice * 0.14 : 0.0;
        double tax = originalPrice * 0.04;
    
        if (originalPrice < 29) {
            originalPrice -= 6.25;
        } else if (originalPrice < 50) {
            originalPrice -= 6.50;
        } else if (originalPrice < 79) {
            originalPrice -= 6.75;
        }
    
        product.setFreight(freight);
    
        double totalDiscounts = fixedFee + premiumFee + classicFee + tax + freight + product.getCost();
    
        double estimatedProfit = originalPrice - totalDiscounts;
    
        // Arredonda para duas casas
        estimatedProfit = Math.round(estimatedProfit * 100.0) / 100.0;
    
        product.setEstimatedGrossProfit(estimatedProfit * product.getQuantity());
    }
}
