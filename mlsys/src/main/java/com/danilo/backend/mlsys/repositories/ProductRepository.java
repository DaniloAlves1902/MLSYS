package com.danilo.backend.mlsys.repositories;

import com.danilo.backend.mlsys.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Product findBySku(String sku);
    Product findByName(String name);
}
