/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const saveTrafficSystem = require("./lib/saveTrafficSystem.js");

module.exports.safeTrafficSystem = saveTrafficSystem;
module.exports.contracts = [saveTrafficSystem];
