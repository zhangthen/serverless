'use strict';

const { addPermission } = require('./lib/permissions');
const { updateConfiguration, removeConfiguration } = require('./lib/bucket');
const { response, getEnvironment, getLambdaArn } = require('../utils');

async function handler(event, context) {
  const PhysicalResourceId = 'CustomResouceS3';
  event = Object.assign({}, event, { PhysicalResourceId });

  if (event.RequestType === 'Create') {
    return create(event, context);
  } else if (event.RequestType === 'Update') {
    return update(event, context);
  } else if (event.RequestType === 'Delete') {
    return remove(event, context);
  }
  const error = new Error(`Unhandled RequestType ${event.RequestType}`);
  return response(event, context, 'FAILED', {}, error);
}

async function create(event, context) {
  const { Region, AccountId } = getEnvironment(context);
  const { FunctionName, BucketName, BucketConfig } = event.ResourceProperties;

  const lambdaArn = getLambdaArn(Region, AccountId, FunctionName);

  try {
    await addPermission({
      functionName: FunctionName,
      bucketName: BucketName,
      region: Region,
    });
    await updateConfiguration({
      lambdaArn,
      region: Region,
      functionName: FunctionName,
      bucketName: BucketName,
      bucketConfig: BucketConfig,
    });
  } catch (error) {
    return response(event, context, 'FAILED', {}, error);
  }

  return response(event, context, 'SUCCESS');
}

async function update(event, context) {
  const { Region, AccountId } = getEnvironment(context);
  const { FunctionName, BucketName, BucketConfig } = event.ResourceProperties;

  const lambdaArn = getLambdaArn(Region, AccountId, FunctionName);

  try {
    await updateConfiguration({
      lambdaArn,
      region: Region,
      functionName: FunctionName,
      bucketName: BucketName,
      bucketConfig: BucketConfig,
    });
  } catch (error) {
    return response(event, context, 'FAILED', {}, error);
  }

  return response(event, context, 'SUCCESS');
}

async function remove(event, context) {
  const { Region } = getEnvironment(context);
  const { FunctionName, BucketName } = event.ResourceProperties;

  try {
    await removeConfiguration({
      region: Region,
      functionName: FunctionName,
      bucketName: BucketName,
    });
  } catch (error) {
    return response(event, context, 'FAILED', {}, error);
  }

  return response(event, context, 'SUCCESS');
}

module.exports = {
  handler,
};
