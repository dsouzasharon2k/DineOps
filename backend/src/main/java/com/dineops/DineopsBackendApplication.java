package com.dineops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class DineopsBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(DineopsBackendApplication.class, args);
	}

}
