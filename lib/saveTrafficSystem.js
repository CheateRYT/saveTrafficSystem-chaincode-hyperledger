/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const stringify = require("json-stringify-deterministic");
const sortKeysRecursive = require("sort-keys-recursive");
const { Contract } = require("fabric-contract-api");

class SafeTrafficSystem extends Contract {
  async InitLedger(ctx) {
    // Инициализация учетной записи банка и водителей

    const roles = ["Driver", "DpsOfficer"];
    await ctx.stub.putState("roles", roles);

    const bankAccount = {
      ID: "bank",
      Balance: 1000,
    };
    const dpsOfficer = {
      ID: "officer1",
      FullName: "Иванов Иван Иванович",
      DrivingLicense: null,
      Experience: 2,
      UnpaidFines: 0,
      Balance: 50,
    };
    const drivers = [
      {
        ID: "driver1",
        FullName: "Семенов Семен Семенович",
        DrivingLicense: null,
        Experience: 5,
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null, // Добавлено поле для даты штрафа
      },
      {
        ID: "driver2",
        FullName: "Петров Петр Петрович",
        DrivingLicense: null,
        Experience: 10,
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null, // Добавлено поле для даты штрафа
      },
    ];
    await ctx.stub.putState(
      bankAccount.ID,
      Buffer.from(stringify(sortKeysRecursive(bankAccount)))
    );
    await ctx.stub.putState(
      dpsOfficer.ID,
      Buffer.from(stringify(sortKeysRecursive(dpsOfficer)))
    );
    for (const driver of drivers) {
      await ctx.stub.putState(
        driver.ID,
        Buffer.from(stringify(sortKeysRecursive(driver)))
      );
    }
  }

  // Функция для добавления водительского удостоверения
  async AddDrivingLicense(ctx, driverId, licenseNumber, expiryDate, category) {
    const driverJSON = await ctx.stub.getState(driverId);
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`);
    }
    const driver = JSON.parse(driverJSON.toString());
    driver.DrivingLicense = {
      Number: licenseNumber,
      ExpiryDate: expiryDate,
      Category: category,
    };
    await ctx.stub.putState(
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver)))
    );
    return JSON.stringify(driver);
  }

  // Функция для регистрации транспортного средства
  async RegisterVehicle(ctx, driverId, vehicleCategory) {
    const driverJSON = await ctx.stub.getState(driverId);
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`);
    }
    const driver = JSON.parse(driverJSON.toString());
    if (
      !driver.DrivingLicense ||
      driver.DrivingLicense.Category !== vehicleCategory
    ) {
      throw new Error(
        `Категория транспортного средства не соответствует категории водительского удостоверения`
      );
    }
    // Здесь можно добавить логику для регистрации транспортного средства
    return `Транспортное средство зарегистрировано для водителя ${driver.FullName}`;
  }

  // Функция для продления срока действия водительского удостоверения
  async RenewDrivingLicense(ctx, driverId) {
    const driverJSON = await ctx.stub.getState(driverId);
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`);
    }
    const driver = JSON.parse(driverJSON.toString());
    const currentDate = new Date();
    const expiryDate = new Date(driver.DrivingLicense.ExpiryDate);
    const timeDiff = expiryDate - currentDate;
    // Проверка условий для продления
    if (timeDiff > 30 * 24 * 60 * 60 * 1000) {
      throw new Error(
        `Срок действия водительского удостоверения не истекает в ближайший месяц`
      );
    }
    if (driver.UnpaidFines > 0) {
      throw new Error(`У водителя есть неоплаченные штрафы`);
    }
    // Здесь можно добавить логику для продления
    return `Срок действия водительского удостоверения продлен для водителя ${driver.FullName}`;
  }

  // Функция для оплаты штрафа
  async PayFine(ctx, driverId) {
    const driverJSON = await ctx.stub.getState(driverId);
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`);
    }
    const driver = JSON.parse(driverJSON.toString());
    if (driver.UnpaidFines === 0) {
      throw new Error(`У водителя нет неоплаченных штрафов`);
    }
    const fineAmount = 10; // Стандартная стоимость штрафа
    const discountPeriod = 5 * 60 * 1000; // Первые 5 дней в миллисекундах
    const currentDate = new Date();
    const fineIssuedDate = new Date(driver.FineIssuedDate); // Используем дату штрафа из структуры водителя

    // Если FineIssuedDate не установлена, то это значит, что штраф не был выписан
    if (!driver.FineIssuedDate) {
      throw new Error(`У водителя нет выписанных штрафов`);
    }

    let totalAmount = fineAmount;
    // Если штраф оплачивается в первые 5 дней, стоимость снижается
    if (currentDate - fineIssuedDate <= discountPeriod) {
      totalAmount = fineAmount / 2;
    }
    if (driver.Balance < totalAmount) {
      throw new Error(`Недостаточно средств для оплаты штрафа`);
    }
    driver.Balance -= totalAmount;
    driver.UnpaidFines -= 1; // Уменьшаем количество неоплаченных штрафов
    await ctx.stub.putState(
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver)))
    );
    return `Штраф оплачен на сумму ${totalAmount} ProfiCoin`;
  }

  // Функция для выписывания штрафа
  async IssueFine(ctx, driverId, role) {
    const driverJSON = await ctx.stub.getState(driverId);
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`);
    }
    const driver = JSON.parse(driverJSON.toString());
    driver.UnpaidFines += 1; // Увеличиваем количество неоплаченных штрафов
    driver.FineIssuedDate = new Date().toISOString(); // Устанавливаем дату выписки штрафа
    await ctx.stub.putState(
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver)))
    );
    return `Штраф выписан водителю ${driver.FullName}`;
  }

  async GetAllDrivers(ctx) {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }
}

module.exports = SafeTrafficSystem;
