'use strict';

const crypto = require('crypto');
const AWS = require('aws-sdk');

function generateId(functionName, bucketConfig) {
  const md5 = crypto
    .createHash('md5')
    .update(JSON.stringify(bucketConfig))
    .digest('hex');
  return `${functionName}-${md5}`;
}

function createFilter(config) {
  const rules = config.Rules;
  if (rules && rules.length) {
    const FilterRules = rules.map(rule => {
      const key = Object.keys(rule)[0];
      const Name = key.toLowerCase();
      const Value = rule[key].toLowerCase();
      return {
        Name,
        Value,
      };
    });
    return {
      Key: {
        FilterRules,
      },
    };
  }
  return undefined;
}

async function getConfiguration(config) {
  const { bucketName, region } = config;
  const s3 = new AWS.S3({ region });
  const Bucket = bucketName;
  const payload = {
    Bucket,
  };
  return s3
    .getBucketNotificationConfiguration(payload)
    .promise()
    .then(data => data);
}

async function updateConfiguration(config) {
  const { lambdaArn, functionName, bucketName, bucketConfig, region } = config;
  const s3 = new AWS.S3({ region });
  const Bucket = bucketName;

  const NotificationConfiguration = await getConfiguration(config);

  // remove configurations for this specific function
  NotificationConfiguration.LambdaFunctionConfigurations = NotificationConfiguration.LambdaFunctionConfigurations.filter(
    conf => !conf.Id.startsWith(functionName)
  );

  // add the event to the existing NotificationConfiguration
  const Events = [bucketConfig.Event];
  const LambdaFunctionArn = lambdaArn;
  const Id = generateId(functionName, bucketConfig);
  const Filter = createFilter(bucketConfig);
  NotificationConfiguration.LambdaFunctionConfigurations.push({
    Events,
    LambdaFunctionArn,
    Filter,
    Id,
  });

  const payload = {
    Bucket,
    NotificationConfiguration,
  };
  return s3.putBucketNotificationConfiguration(payload).promise();
}

async function removeConfiguration(config) {
  const { functionName, bucketName, region } = config;
  const s3 = new AWS.S3({ region });
  const Bucket = bucketName;

  const NotificationConfiguration = await getConfiguration(config);

  // remove configurations for this specific function
  NotificationConfiguration.LambdaFunctionConfigurations = NotificationConfiguration.LambdaFunctionConfigurations.filter(
    conf => !conf.Id.startsWith(functionName)
  );

  const payload = {
    Bucket,
    NotificationConfiguration,
  };
  return s3.putBucketNotificationConfiguration(payload).promise();
}

module.exports = {
  updateConfiguration,
  removeConfiguration,
};
