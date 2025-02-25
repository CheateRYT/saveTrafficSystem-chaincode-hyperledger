//TODODODODODODOO ПОфиксить регистрацию попробовать перезапустить сеть

"use strict";
const stringify = require("json-stringify-deterministic");
const sortKeysRecursive = require("sort-keys-recursive");
const { Contract } = require("fabric-contract-api");
const crypto = require("crypto");

class SafeTrafficSystem extends Contract {
  constructor() {
    super();
    this.userLogins = [];
    this.roles = ["Driver", "DpsOfficer"];
  }
  async InitLedger(ctx) {
    this.startTime = new Date(); // Сохраняем текущее время как время старта
    await ctx.stub.putState(
      "startTime",
      Buffer.from(this.startTime.toISOString())
    ); // Сохраняем startTime в состоянии
    const bankAccount = {
      login: "bank",
      Balance: 1000,
    };
    const drivers = [
      {
        login: "oleg",
        password:
          "0dd3e512642c97ca3f747f9a76e374fbda73f9292823c0313be9d78add7cdd8f72235af0c553dd26797e78e1854edee0ae002f8aba074b066dfce1af114e32f8", // qwerty
        key: "3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1eb8b85103e3be7ba613b31bb5c9c36214dc9f14a42fd7a2fdb84856bca5c44c2", // 123
        FullName: "Иванов Иван Иванович",
        DrivingLicenses: [],
        Experience: 2,
        Role: this.roles[1],
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null,
        Vehicles: [],
        Requests: [],
      },
      {
        login: "semen",
        password:
          "8de463cfff3981ba691e0e6eed3d35327aa8da2c885a1c44fa6cc76124e42aa6c2024f863809b377fd3c3093df47c4b79ab3c2a52aac3e94c54421221c125582", // qwerty3
        key: "d404559f602eab6fd602ac7680dacbfaadd13630335e951f097af3900e9de176b6db28512f2e000b9d04fba5133e8b1c6e8df59db3a8ab9d60be4b97cc9e81db", // 1234
        FullName: "Семенов Семен Семенович",
        DrivingLicenses: [],
        Experience: 5,
        Role: this.roles[0],
        YearStartedDriving: 2016,
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null,
        Vehicles: [],
        Requests: [],
      },
      {
        login: "petrov",
        password:
          "af28cda3e12df033ba1385b67cf477e60876ae65249b4f4c6bbe3b7de128abfe14fb6d390514948a27a5d69e7f1349068890ec9acfe94f152309a857858e4eab", // qwerty2
        key: "3627909a29c31381a071ec27f7c9ca97726182aed29a7ddd2e54353322cfb30abb9e3a6df2ac2c20fe23436311d678564d0c8d305930575f60e2d3d048184", // 12345
        FullName: "Петров Петр Петрович",
        DrivingLicenses: [],
        Experience: 10,
        YearStartedDriving: 2011,
        UnpaidFines: 0,
        Role: this.roles[0],
        Balance: 50,
        FineIssuedDate: null,
        Vehicles: [],
        Requests: [],
      },
    ];

    this.userLogins = ["bank", "oleg", "semen", "petrov"];
    await ctx.stub.putState(
      bankAccount.login,
      Buffer.from(stringify(sortKeysRecursive(bankAccount)))
    );
    for (const user of drivers) {
      await ctx.stub.putState(
        user.login,
        Buffer.from(stringify(sortKeysRecursive(user)))
      );
    }
  }
  async isDps(ctx, login) {
    const dpsJSON = await ctx.stub.getState(login);
    if (!dpsJSON || dpsJSON.length === 0) {
      throw new Error(`Водитель с ID ${login} не найден`);
    }
    const dps = JSON.parse(dpsJSON.toString());

    // Используем JSON.stringify для вывода объекта
    if (dps.Role !== "DpsOfficer") {
      throw new Error(`Вы не ДПСНИК Ваша роль - ${JSON.stringify(dps)}`);
    }
  }
  async getUser(ctx, login) {
    try {
      const userJSON = await ctx.stub.getState(login);

      if (!userJSON || userJSON.length === 0) {
        throw new Error(`Пользователь с логином ${login} не найден`);
      }

      const user = JSON.parse(userJSON.toString());
      return user;
    } catch (e) {
      console.error("Ошибка при получении пользователя:", e);
      throw new Error("Ошибка при получении пользователя: " + e.message); // Возвращаем ошибку
    }
  }

  async GetAllDrivers(ctx) {
    const allResults = [];

    for (const login of this.userLogins) {
      const userJSON = await ctx.stub.getState(login); // Получаем данные пользователя по логину
      if (userJSON && userJSON.length > 0) {
        const user = JSON.parse(userJSON.toString()); // Преобразуем данные пользователя из JSON
        allResults.push(user); // Добавляем запись в массив результатов
      }
    }

    return JSON.stringify(allResults); // Возвращаем массив пользователей в формате JSON
  }

  // Функция аутентификации пользователя
  async auth(ctx, login, password, key) {
    try {
      const userJSON = await ctx.stub.getState(login);

      if (!userJSON || userJSON.length === 0) {
        throw new Error(`Пользователь с логином ${login} не найден`);
      }

      const user = JSON.parse(userJSON.toString()); // Преобразуем данные пользователя из JSON
      const passwordHash = user.password.toString(); // Хеш пароля пользователя
      const userKey = user.key; // Хеш ключа пользователя
      const keyHash = crypto // Хешируем введенный пароль
        .createHash("sha512")
        .update(key)
        .digest("hex");
      const inputPasswordHash = crypto // Хешируем введенный пароль
        .createHash("sha512")
        .update(password)
        .digest("hex");

      // Сравниваем хеши пароля и ключа
      if (inputPasswordHash !== passwordHash) {
        throw new Error(`Неверный пароль для пользователя с логином ${login}`); // Если пароль неверный, выбрасываем ошибку
      }

      if (userKey !== keyHash) {
        throw new Error(`Неверный ключ для пользователя с логином ${login}`); // Если ключ неверный, выбрасываем ошибку
      }

      return { auth: true, user }; // Если совпадают, возвращаем true
    } catch (error) {
      // Обработка ошибок
      console.error(`Ошибка при аутентификации пользователя: ${error.message}`); // Логируем ошибку
      throw new Error(`Ошибка аутентификации: ${error.message}`); // Пробрасываем ошибку дальше
    }
  }

  async registerUser(
    ctx,
    login,
    password,
    key,
    balance,
    role,
    fullName,
    yearStartedDriving
  ) {
    const user = {
      login: login,
    };
    await ctx.stub.putState(
      login,
      Buffer.from(stringify(sortKeysRecursive(user)))
    );
  }

  async register(
    ctx,
    login,
    password,
    key,
    balance,
    role,
    fullName,
    yearStartedDriving
  ) {
    try {
      // Проверяем, что все необходимые параметры переданы
      if (
        !login ||
        !password ||
        !key ||
        !role ||
        !fullName ||
        !yearStartedDriving
      ) {
        throw new Error("Все поля должны быть заполнены.");
      }

      const passwordHash = crypto
        .createHash("sha512")
        .update(password)
        .digest("hex");
      const keyHash = crypto.createHash("sha512").update(key).digest("hex");
      const user = {
        login: login,
        Role: role,
        password: passwordHash,
        key: keyHash,
        FullName: fullName,
        DrivingLicenses: [],
        Experience: new Date().getFullYear() - Number(yearStartedDriving),
        UnpaidFines: 0,
        Balance: Number(balance),
        FineIssuedDate: null,
        Vehicles: [],
        Requests: [],
      };
      await ctx.stub.putState(
        login,
        Buffer.from(stringify(sortKeysRecursive(user)))
      );
      this.userLogins.push(login); // Добавляем логин в массив
      return JSON.stringify(user); // Возвращаем данные о пользователе
    } catch (error) {
      console.error("Ошибка при создании пользователя:", error);
      throw new Error(`Не удалось создать пользователя: ${error.message}`);
    }
  }

  // Функция регистрации транспортного средства
  async RegisterVehicleRequest(
    ctx,
    login,
    vehicleCategory,
    marketValue,
    exploitationPeriod
  ) {
    try {
      const driverJSON = await ctx.stub.getState(login); // Получаем данные водителя по ID
      if (!driverJSON || driverJSON.length === 0) {
        throw new Error(`Водитель с Login ${login} не найден`); // Если водитель не найден, выбрасываем ошибку
      }
      const driver = JSON.parse(driverJSON.toString());

      const request = {
        requestIndex: driver.Requests.length,
        type: "VehicleRegistration",
        vehicleCategory,
        marketValue,
        exploitationPeriod,
        status: "Pending",
      };
      driver.Requests.push(request);
      // if (
      //   !driver.DrivingLicenses.some(
      //     (license) => license.Category === vehicleCategory
      //   )
      // ) {
      //   throw new Error(
      //     `Категория транспортного средства не соответствует категории водительского удостоверения`
      //   ); // Если нет, выбрасываем ошибку
      // }

      // // Создаем объект транспортного средства
      // const vehicle = {
      //   ID: driver.Vehicles.length + 1, // ID машины - индекс + 1
      //   Category: vehicleCategory,
      //   MarketValue: marketValue,
      //   ExploitationPeriod: exploitationPeriod,
      // };
      // driver.Vehicles.push(vehicle); // Добавляем машину в массив

      await ctx.stub.putState(
        login,
        Buffer.from(stringify(sortKeysRecursive(driver))) // Сохраняем обновленные данные водителя
      );
      return JSON.stringify(
        `Транспортное средство зарегистрировано для водителя ${driver.FullName}`
      ); // Возвращаем сообщение об успешной регистрации
    } catch (error) {
      console.error(error);
      throw new Error("Ошибка при запросе на регистрацию транспорта:" + error);
    }
  }

  async ApproveRegisterVehicle(ctx, login, recipientLogin, requestIndex) {
    try {
      await this.isDps(ctx, login);

      const driverJSON = await ctx.stub.getState(recipientLogin); // Получаем данные водителя по ID
      if (!driverJSON || driverJSON.length === 0) {
        throw new Error(`Водитель с Login ${recipientLogin} не найден`); // Если водитель не найден, выбрасываем ошибку
      }

      const driver = JSON.parse(driverJSON.toString()); // Преобразуем данные водителя из JSON

      // Проверяем, существует ли запрос на регистрацию транспортного средства
      if (
        !driver.Requests ||
        driver.Requests.length <= requestIndex ||
        driver.Requests[requestIndex].type !== "VehicleRegistration"
      ) {
        throw new Error(
          `Запрос на регистрацию транспортного средства не найден`
        ); // Если запрос не найден, выбрасываем ошибку
      }

      // Утверждаем запрос
      driver.Requests[requestIndex].status = "Approved"; // Устанавливаем статус запроса как "Approved"

      // Извлекаем информацию о транспортном средстве из запроса
      const request = driver.Requests[requestIndex];
      const vehicle = {
        ID: driver.Vehicles.length + 1, // ID машины - индекс + 1
        Category: request.vehicleCategory,
        MarketValue: request.marketValue,
        ExploitationPeriod: request.exploitationPeriod,
      };

      driver.Vehicles.push(vehicle); // Добавляем машину в массив Vehicles

      await ctx.stub.putState(
        recipientLogin,
        Buffer.from(stringify(sortKeysRecursive(driver)))
      );
      return JSON.stringify(`Транспорт успешно подтвержден`);
    } catch (error) {
      console.error(error);
      throw new Error("Ошибка при запросе на регистрацию транспорта:" + error);
    }
  }
  // Функция регистрации запроса на получение водительского удостоверения
  async RequestDrivingLicense(ctx, login, licenseNumber, category) {
    try {
      const driverJSON = await ctx.stub.getState(login);
      if (!driverJSON || driverJSON.length === 0) {
        throw new Error(`Водитель с Login ${login} не найден`);
      }
      const driver = JSON.parse(driverJSON.toString());
      const request = {
        requestIndex: driver.Requests.length,
        type: "DrivingLicenseRequest",
        licenseNumber,
        category,
        status: "Pending",
      };
      driver.Requests.push(request);
      await ctx.stub.putState(
        login,
        Buffer.from(stringify(sortKeysRecursive(driver)))
      );
      return JSON.stringify("Запрос на получеие прав успешно отправлен");
    } catch (error) {
      console.error(error);
      throw new Error("Ошибка при запросе на вод права" + error);
    }
  }

  // Функция для подтверждения запроса на получение водительского удостоверения
  async ApproveDrivingLicenseRequest(
    ctx,
    officerLogin,
    recipientLogin,
    requestIndex,
    expiryDate
  ) {
    try {
      await this.isDps(ctx, officerLogin);
      const driverJSON = await ctx.stub.getState(recipientLogin);
      if (!driverJSON || driverJSON.length === 0) {
        throw new Error(`Водитель с Login ${recipientLogin} не найден`);
      }
      const driver = JSON.parse(driverJSON.toString());
      if (
        !driver.Requests ||
        driver.Requests.length <= requestIndex ||
        driver.Requests[requestIndex].type !== "DrivingLicenseRequest"
      ) {
        throw new Error(
          `Запрос на получение водительского удостоверения не найден`
        );
      }
      driver.Requests[requestIndex].status = "Approved";
      const newLicense = {
        Number: driver.Requests[requestIndex].licenseNumber,
        ExpiryDate: expiryDate,
        Category: driver.Requests[requestIndex].category,
      };
      driver.DrivingLicenses.push(newLicense);
      await ctx.stub.putState(
        recipientLogin,
        Buffer.from(stringify(sortKeysRecursive(driver)))
      );
      return JSON.stringify(
        `Запрос на получение водительского удостоверения для водителя ${driver.FullName} утвержден.`
      );
    } catch (error) {
      console.error(error);
      throw new Error("Ошибка при подтверждении на вод права" + error);
    }
  }

  // Функция регистрации запроса на продление водительского удостоверения
  async RequestRenewDrivingLicense(ctx, login, licenseNumber) {
    try {
      const driverJSON = await ctx.stub.getState(login);
      if (!driverJSON || driverJSON.length === 0) {
        throw new Error(`Водитель с Login ${login} не найден`);
      }
      const driver = JSON.parse(driverJSON.toString());
      const request = {
        requestIndex: driver.Requests.length,
        type: "RenewDrivingLicenseRequest",
        licenseNumber,
        status: "Pending",
      };
      driver.Requests.push(request);
      await ctx.stub.putState(
        login,
        Buffer.from(stringify(sortKeysRecursive(driver)))
      );
      return JSON.stringify(
        `Запрос на продление водительского удостоверения отправлен для водителя ${driver.FullName}`
      );
    } catch (error) {
      console.error(error);
      throw new Error("Ошибка при запросе на продление вод права" + error);
    }
  }

  // Функция для подтверждения запроса на продление водительского удостоверения
  async ApproveRenewDrivingLicenseRequest(
    ctx,
    officerLogin,
    recipientLogin,
    requestIndex
  ) {
    try {
      await this.isDps(ctx, officerLogin);
      const driverJSON = await ctx.stub.getState(recipientLogin);
      if (!driverJSON || driverJSON.length === 0) {
        throw new Error(`Водитель с Login ${recipientLogin} не найден`);
      }
      const driver = JSON.parse(driverJSON.toString());
      if (
        !driver.Requests ||
        driver.Requests.length <= requestIndex ||
        driver.Requests[requestIndex].type !== "RenewDrivingLicenseRequest"
      ) {
        throw new Error(
          `Запрос на продление водительского удостоверения не найден`
        );
      }

      const request = driver.Requests[requestIndex];
      const licenseToRenew = driver.DrivingLicenses.find(
        (license) => license.Number === request.licenseNumber
      );

      if (!licenseToRenew) {
        throw new Error(
          `Водительское удостоверение с номером ${request.licenseNumber} не найдено`
        );
      }

      // Обновляем дату истечения удостоверения (например, добавляем 5 лет)
      const newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 5);
      licenseToRenew.ExpiryDate = newExpiryDate.toISOString().split("T")[0]; // Устанавливаем новую дату истечения

      driver.Requests[requestIndex].status = "Approved"; // Устанавливаем статус запроса как "Approved"
      await ctx.stub.putState(
        recipientLogin,
        Buffer.from(stringify(sortKeysRecursive(driver)))
      );
      return JSON.stringify(
        `Запрос на продление водительского удостоверения для водителя ${driver.FullName} утвержден.`
      );
    } catch (error) {
      console.error(error);
      throw new Error(
        "Ошибка при подтверждении на продление вод права" + error
      );
    }
  }

  // Функция оплаты штрафа
  async PayFine(ctx, login) {
    const driverJSON = await ctx.stub.getState(login);
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${login} не найден`);
    }
    const driver = JSON.parse(driverJSON.toString());
    if (driver.UnpaidFines === 0) {
      throw new Error(`У водителя нет неоплаченных штрафов`);
    }
    const fineAmount = 10; // Стандартная стоимость штрафа
    const discountPeriod = 5 * 60 * 1000; // Первые 5 дней в миллисекундах
    const currentDate = new Date();

    // Получаем время старта из состояния
    const startTimeJSON = await ctx.stub.getState("startTime");
    if (!startTimeJSON || startTimeJSON.length === 0) {
      throw new Error(`Время старта системы не найдено`);
    }
    const startTime = new Date(startTimeJSON.toString()); // Преобразуем в объект Date

    // Рассчитываем время, прошедшее с момента старта
    const elapsedTime = currentDate - startTime; // Время в миллисекундах
    const daysPassed = Math.floor(elapsedTime / (1000 * 60)); // Преобразуем в дни

    // Если штраф был выписан менее 5 дней назад, применяем скидку
    let totalAmount = fineAmount; // Общая сумма штрафа
    if (daysPassed <= discountPeriod / (1000 * 60)) {
      totalAmount = fineAmount / 2; // Скидка 50%
    }

    if (driver.Balance < totalAmount) {
      throw new Error(`Недостаточно средств для оплаты штрафа`);
    }
    driver.Balance -= totalAmount; // Уменьшаем баланс
    driver.UnpaidFines -= 1; // Уменьшаем количество неоплаченных штрафов
    await ctx.stub.putState(
      login,
      Buffer.from(stringify(sortKeysRecursive(driver)))
    );
    return JSON.stringify(`Штраф оплачен на сумму ${totalAmount} ProfiCoin`);
  }

  async IssueFine(ctx, login, recipientLogin) {
    await this.isDps(ctx, login);

    const driverJSON = await ctx.stub.getState(recipientLogin); // Получаем данные водителя по ID
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${recipientLogin} не найден`); // Если водитель не найден, выбрасываем ошибку
    }

    const driver = JSON.parse(driverJSON.toString()); // Преобразуем данные водителя из JSON
    driver.UnpaidFines += 1; // Увеличиваем количество неоплаченных штрафов
    driver.FineIssuedDate = new Date().toString(); // Устанавливаем дату выписки штрафа

    await ctx.stub.putState(
      recipientLogin,
      Buffer.from(JSON.stringify(driver)) // Сохраняем обновленные данные водителя
    );

    return JSON.stringify(`Штраф выписан водителю ${driver.FullName}`); // Возвращаем сообщение о выписке штрафа
  }
}

module.exports = SafeTrafficSystem;
