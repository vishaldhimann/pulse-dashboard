/**
 * @pulse/sdk — Main entry point
 */
const PulseCore = require('./core');
const PulseBrowser = require('./browser');
const PulseNode = require('./node');
const { createPulseForAngular } = require('./angular');
const LendingPlugin = require('./plugins/lending');
const { hashString, generateEventId, sanitizeMetadata } = require('./utils');

module.exports = {
  PulseCore,
  PulseBrowser,
  PulseNode,
  createPulseForAngular,
  LendingPlugin,
  hashString,
  generateEventId,
  sanitizeMetadata
};
