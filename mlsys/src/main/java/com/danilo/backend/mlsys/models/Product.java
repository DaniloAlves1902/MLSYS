package com.danilo.backend.mlsys.models;

import com.danilo.backend.mlsys.models.enums.Voltage;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AllArgsConstructor;
import lombok.ToString;

import com.danilo.backend.mlsys.models.enums.Status;



@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sku;
    private String name;
    private String description;
    private Integer quantity;
    private String color;

    private Voltage voltage;
    private Double cost;
    private Double grossSalePrice;
    private Double estimatedGrossProfit;
    private Double estimatedCollectProfit;

    private Boolean premiumRate;
    private Boolean classicRate;

    private Double freight;
    private Status status;

}
