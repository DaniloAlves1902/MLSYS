package com.danilo.backend.mlsys.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
        return productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found"));
    }

    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, Product product) {
        ensureTodoExists(id);
        product.setId(id);
        return productRepository.save(product);
    }

    public void deleteProduct(Long id) {
        ensureTodoExists(id);
        productRepository.deleteById(id);
    }

    private void ensureTodoExists(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Error: product not found with id " + id);
        }
    }
}
