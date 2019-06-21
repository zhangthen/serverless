'use strict';

const path = require('path');
const fs = require('fs');
const chai = require('chai');
const AwsProvider = require('../provider/awsProvider');
const Serverless = require('../../../Serverless');
const { createTmpDir } = require('../../../../tests/utils/fs');
const { addCustomResourceToService } = require('./index.js');

const expect = chai.expect;
chai.use(require('chai-as-promised'));

describe('#addCustomResourceToService()', () => {
  let tmpDirPath;
  let serverless;
  let provider;
  let context;

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    tmpDirPath = createTmpDir();
    serverless = new Serverless();
    provider = new AwsProvider(serverless, options);
    serverless.setProvider('aws', provider);
    serverless.service.service = 'some-service';
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {},
    };
    serverless.config.servicePath = tmpDirPath;
    serverless.service.package.artifactDirectoryName = 'artifact-dir-name';
    context = {
      serverless,
      provider,
      options,
    };
  });

  describe('when using the custom S3 resouce', () => {
    it('should add the custom resource to the service', () => {
      return expect(addCustomResourceToService.call(context, 's3')).to.be.fulfilled.then(() => {
        const { Resources } = serverless.service.provider.compiledCloudFormationTemplate;
        const customResourcesZipFilePath = path.join(
          tmpDirPath,
          '.serverless',
          'custom-resources.zip'
        );

        expect(fs.existsSync(customResourcesZipFilePath)).to.equal(true);
        expect(Resources).to.deep.equal({
          CustomDashresourcesDashs3LambdaFunction: {
            Type: 'AWS::Lambda::Function',
            Properties: {
              Code: {
                S3Bucket: { Ref: 'ServerlessDeploymentBucket' },
                S3Key: 'artifact-dir-name/custom-resources.zip',
              },
              FunctionName: 'some-service-dev-custom-resources-s3',
              Handler: 's3/handler.handler',
              MemorySize: 1024,
              Role: { 'Fn::GetAtt': ['IamRoleLambdaExecution', 'Arn'] },
              Runtime: 'nodejs10.x',
              Timeout: 6,
            },
            DependsOn: ['IamRoleLambdaExecution'],
          },
        });
      });
    });
  });
});
