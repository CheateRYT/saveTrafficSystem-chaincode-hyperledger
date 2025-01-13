"use strict";
const stringify = require("json-stringify-deterministic");
const sortKeysRecursive = require("sort-keys-recursive");
const { Contract } = require("fabric-contract-api");
const crypto = require("crypto");
const inputPasswordHash = crypto // Хешируем введенный пароль
  .createHash("sha512")
  .update(password)
  .digest("hex");
class SafeTrafficSystem extends Contract {
  async InitLedger(ctx) {
    this.startTime = new Date(); // Сохраняем текущее время как время старта
    await ctx.stub.putState(
      "startTime",
      Buffer.from(this.startTime.toISOString())
    ); // Сохраняем startTime в состоянии

    const roles = ["Driver", "DpsOfficer"];
    await ctx.stub.putState(
      "roles",
      Buffer.from(stringify(sortKeysRecursive(roles)))
    );

    const bankAccount = {
      ID: "bank",
      Balance: 1000,
    };

    const drivers = [
      {
        ID: "1",
        Role: roles[1],
        login: "oleg",
        password:
          "0dd3e512642c97ca3f747f9a76e374fbda73f9292823c0313be9d78add7cdd8f72235af0c553dd26797e78e1854edee0ae002f8aba074b066dfce1af114e32f8", // qwerty
        key: "3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1eb8b85103e3be7ba613b31bb5c9c36214dc9f14a42fd7a2fdb84856bca5c44c2", // 123
        FullName: "Иванов Иван Иванович",
        DrivingLicenses: [], // Массив водительских удостоверений
        Experience: 2,
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null,
        Vehicles: [], // Массив машин
      },
      {
        ID: "2",
        Role: roles[0],
        login: "semen",
        password:
          "8de463cfff3981ba691e0e6eed3d35327aa8da2c885a1c44fa6cc76124e42aa6c2024f863809b377fd3c3093df47c4b79ab3c2a52aac3e94c54421221c125582", // qwerty3
        key: "d404559f602eab6fd602ac7680dacbfaadd13630335e951f097af3900e9de176b6db28512f2e000b9d04fba5133e8b1c6e8df59db3a8ab9d60be4b97cc9e81db", // 1234
        FullName: "Семенов Семен Семенович",
        DrivingLicenses: [], // Массив водительских удостоверений
        Experience: 5,
        YearStartedDriving: 2016,
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null,
        Vehicles: [], // Массив машин
      },
      {
        ID: "3",
        Role: roles[0],
        login: "petrov",
        password:
          "af28cda3e12df033ba1385b67cf477e60876ae65249b4f4c6bbe3b7de128abfe14fb6d390514948a27a5d69e7f1349068890ec9acfe94f152309a857858e4eab", // qwerty2
        key: "3627909a29c31381a071ec27f7c9ca97726182aed29a7ddd2e54353322cfb30abb9e3a6df2ac2c20fe23436311d678564d0c8d305930575f60e2d3d048184", // 12345
        FullName: "Петров Петр Петрович",
        DrivingLicenses: [], // Массив водительских удостоверений
        Experience: 10,
        YearStartedDriving: 2011,
        UnpaidFines: 0,
        Balance: 50,
        FineIssuedDate: null,
        Vehicles: [], // Массив машин
      },
    ];

    await ctx.stub.putState(
      bankAccount.ID,
      Buffer.from(stringify(sortKeysRecursive(bankAccount)))
    );

    for (const user of drivers) {
      await ctx.stub.putState(
        user.ID,
        Buffer.from(stringify(sortKeysRecursive(user)))
      );
    }
  }
  // Функция аутентификации пользователя
  async auth(ctx, login, password, key) {
    const userJSON = await ctx.stub.getState(login); // Получаем данные пользователя по логину
    if (!userJSON || userJSON.length === 0) {
      throw new Error(`Пользователь с логином ${login} не найден`); // Если пользователь не найден, выбрасываем ошибку
    }
    const user = JSON.parse(userJSON.toString()); // Преобразуем данные пользователя из JSON
    const passwordHash = user.password; // Хеш пароля пользователя
    const keyHash = user.key; // Хеш ключа пользователя
    const inputPasswordHash = crypto // Хешируем введенный пароль
      .createHash("sha512")
      .update(password)
      .digest("hex");

    // Сравниваем хеши пароля и ключа
    if (inputPasswordHash === passwordHash && key === keyHash) {
      return { auth: true, role: user.role }; // Если совпадают, возвращаем true
    }
    return { auth: false }; // В противном случае возвращаем false
  }

  // Функция создания нового пользователя
  async createUser(
    ctx,
    login,
    password,
    key,
    userId,
    balance = 50,
    role,
    fullName,
    yearStartedDriving
  ) {
    const roles = await ctx.stub.getState("roles"); // Получаем доступные роли
    const roleList = JSON.parse(roles.toString()); // Преобразуем роли из JSON
    if (!roleList.includes(role)) {
      throw new Error(`Роль ${role} не существует`); // Проверяем, существует ли роль
    }

    // Хешируем пароль и ключ
    const passwordHash = crypto
      .createHash("sha512")
      .update(password)
      .digest("hex");
    const keyHash = crypto.createHash("sha512").update(key).digest("hex");

    // Создаем объект пользователя
    const user = {
      ID: userId,
      Role: role,
      login: login,
      password: passwordHash,
      key: keyHash,
      FullName: fullName,
      DrivingLicenses: [], // Массив водительских удостоверений
      Experience: new Date().getFullYear() - yearStartedDriving, // Опыт
      UnpaidFines: 0, // Количество неоплаченных штрафов
      Balance: balance, // Баланс
      FineIssuedDate: null, // Дата выписки штрафа
      Vehicles: [], // Массив машин
    };

    // Сохраняем пользователя в состоянии блокчейна
    await ctx.stub.putState(
      userId,
      Buffer.from(stringify(sortKeysRecursive(user)))
    );
    return JSON.stringify(user); // Возвращаем данные о пользователе
  }

  // Функция добавления водительского удостоверения
  async AddDrivingLicense(ctx, driverId, licenseNumber, expiryDate, category) {
    const driverJSON = await ctx.stub.getState(driverId); // Получаем данные водителя по ID
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`); // Если водитель не найден, выбрасываем ошибку
    }
    const driver = JSON.parse(driverJSON.toString()); // Преобразуем данные водителя из JSON
    const newLicense = {
      // Создаем новое удостоверение
      Number: licenseNumber,
      ExpiryDate: expiryDate,
      Category: category,
    };
    if (!this.isDrivingLicenseValid(newLicense)) {
      throw new Error(`Водительское удостоверение недействительно`); // Проверяем, действительно ли удостоверение
    }

    driver.DrivingLicenses.push(newLicense); // Добавляем новое удостоверение в массив
    await ctx.stub.putState(
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver))) // Сохраняем обновленные данные водителя
    );
    return JSON.stringify(driver); // Возвращаем обновленные данные водителя
  }

  // Функция проверки действительности водительского удостоверения
  isDrivingLicenseValid(license) {
    const validLicenses = [
      // Массив действительных удостоверений
      { Number: "000", ExpiryDate: "2021-01-11", Category: "A" },
      { Number: "111", ExpiryDate: "2025-05-12", Category: "B" },
      { Number: "222", ExpiryDate: "2020-09-09", Category: "C" },
      { Number: "333", ExpiryDate: "2027-02-13", Category: "A" },
      { Number: "444", ExpiryDate: "2020-09-10", Category: "B" },
      { Number: "555", ExpiryDate: "2029-06-24", Category: "C" },
      { Number: "666", ExpiryDate: "2030-03-31", Category: "A" },
    ];
    // Проверяем, есть ли удостоверение в списке действительных
    return validLicenses.some(
      (validLicense) =>
        validLicense.Number === license.Number &&
        validLicense.Category === license.Category &&
        new Date(license.ExpiryDate) > new Date() // Проверяем дату истечения
    );
  }

  // Функция регистрации транспортного средства
  async RegisterVehicle(
    ctx,
    driverId,
    vehicleCategory,
    marketValue,
    exploitationPeriod
  ) {
    const driverJSON = await ctx.stub.getState(driverId); // Получаем данные водителя по ID
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`); // Если водитель не найден, выбрасываем ошибку
    }
    const driver = JSON.parse(driverJSON.toString()); // Преобразуем данные водителя из JSON
    // Проверяем, есть ли у водителя удостоверение соответствующей категории
    if (
      !driver.DrivingLicenses.some(
        (license) => license.Category === vehicleCategory
      )
    ) {
      throw new Error(
        `Категория транспортного средства не соответствует категории водительского удостоверения`
      ); // Если нет, выбрасываем ошибку
    }

    // Создаем объект транспортного средства
    const vehicle = {
      ID: driver.Vehicles.length + 1, // ID машины - индекс + 1
      Category: vehicleCategory,
      MarketValue: marketValue,
      ExploitationPeriod: exploitationPeriod,
    };
    driver.Vehicles.push(vehicle); // Добавляем машину в массив
    await ctx.stub.putState(
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver))) // Сохраняем обновленные данные водителя
    );
    return `Транспортное средство зарегистрировано для водителя ${driver.FullName}`; // Возвращаем сообщение об успешной регистрации
  }

  // Функция продления водительского удостоверения
  async RenewDrivingLicense(ctx, driverId) {
    const driverJSON = await ctx.stub.getState(driverId); // Получаем данные водителя по ID
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`); // Если водитель не найден, выбрасываем ошибку
    }
    const driver = JSON.parse(driverJSON.toString()); // Преобразуем данные водителя из JSON
    const currentDate = new Date(); // Текущая дата
    // Фильтруем удостоверения, срок действия которых истекает в ближайший месяц
    const licensesToRenew = driver.DrivingLicenses.filter((license) => {
      const expiryDate = new Date(license.ExpiryDate);
      const timeDiff = expiryDate - currentDate; // Разница между датами
      return timeDiff <= 30 * 24 * 60 * 60 * 1000 && timeDiff >= 0; // Менее 30 дней до истечения
    });
    if (licensesToRenew.length === 0) {
      throw new Error(
        `Нет водительских удостоверений, срок действия которых истекает в ближайший месяц`
      ); // Если нет удостоверений для продления, выбрасываем ошибку
    }
    if (driver.UnpaidFines > 0) {
      throw new Error(`У водителя есть неоплаченные штрафы`); // Если есть неоплаченные штрафы, выбрасываем ошибку
    }
    return `Срок действия водительских удостоверений продлен для водителя ${driver.FullName}`; // Возвращаем сообщение о продлении
  }

  // Функция оплаты штрафа
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
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver)))
    );
    return `Штраф оплачен на сумму ${totalAmount} ProfiCoin`;
  }

  // Функция выписки штрафа
  async IssueFine(ctx, driverId) {
    const driverJSON = await ctx.stub.getState(driverId); // Получаем данные водителя по ID
    if (!driverJSON || driverJSON.length === 0) {
      throw new Error(`Водитель с ID ${driverId} не найден`); // Если водитель не найден, выбрасываем ошибку
    }
    const driver = JSON.parse(driverJSON.toString()); // Преобразуем данные водителя из JSON
    driver.UnpaidFines += 1; // Увеличиваем количество неоплаченных штрафов
    driver.FineIssuedDate = new Date().toISOString(); // Устанавливаем дату выписки штрафа
    await ctx.stub.putState(
      driverId,
      Buffer.from(stringify(sortKeysRecursive(driver))) // Сохраняем обновленные данные водителя
    );
    return `Штраф выписан водителю ${driver.FullName}`; // Возвращаем сообщение о выписке штрафа
  }

  // Функция получения всех водителей
  async GetAllDrivers(ctx) {
    const allResults = []; // Массив для хранения результатов
    const iterator = await ctx.stub.getStateByRange("", ""); // Получаем все состояния
    let result = await iterator.next(); // Переходим к следующему элементу
    while (!result.done) {
      // Пока есть элементы
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      ); // Преобразуем значение в строку
      let record; // Переменная для хранения записи
      try {
        record = JSON.parse(strValue); // Пробуем преобразовать строку в JSON
      } catch (err) {
        console.log(err); // Если ошибка, выводим в консоль
        record = strValue; // Записываем строку как есть
      }
      allResults.push(record); // Добавляем запись в массив результатов
      result = await iterator.next(); // Переходим к следующему элементу
    }
    return JSON.stringify(allResults);
  }
}
module.exports = SafeTrafficSystem;
