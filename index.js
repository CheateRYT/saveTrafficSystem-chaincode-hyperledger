/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const assetTransfer = require("./lib/saveTrafficSystem");

module.exports.SafeTrafficSystem = saveTrafficSystem;
module.exports.contracts = [saveTrafficSystem];
