import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class MyairlineservicesStack extends cdk.Stack {

      constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

    // Create a custom event bus named 'myservicesevent'
    const customEventBus = new events.EventBus(this, 'CustomEventBus', {
      eventBusName: 'myservicesevent',
    });

    // Create a DynamoDB table named 'flightInfo' with primary key 'destination' and sort key 'date'
    const flightInfoTable = new dynamodb.Table(this, 'FlightInfoTable', {
      tableName: 'flightInfo',
      partitionKey: {
        name: 'destination',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'date',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // WARNING: This will delete the table and its data when the stack is destroyed
    });

    // Create an AWS Lambda function to handle booking flights
    const bookFlightHandler = new lambda.Function(this, 'BookFlightHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda', 'bookflight')),
      handler: 'index.handler',
      environment: {
        EVENT_BUS_NAME: customEventBus.eventBusName,
        TABLE_NAME: flightInfoTable.tableName,
      },
    });

        // Allow the Lambda function to access the DynamoDB table
        flightInfoTable.grantReadWriteData(bookFlightHandler);


    // Allow the Lambda function to publish events to the custom event bus
    customEventBus.grantPutEventsTo(bookFlightHandler);

    // Create an API Gateway REST API for 'myairlineservice'
    const api = new apigateway.RestApi(this, 'MyAirlineService', {
      restApiName: 'myairlineservice',
    });

    // Create an API Gateway Lambda integration for 'bookflight' Lambda function
    const bookFlightIntegration = new apigateway.LambdaIntegration(bookFlightHandler);

    // Create a resource and method for booking a flight
    const bookFlightResource = api.root.addResource('bookflight');
    bookFlightResource.addMethod('POST', bookFlightIntegration);

    // Create an AWS Lambda function to handle registering bookings
    const registerBookingHandler = new lambda.Function(this, 'RegisterBookingHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda', 'registerbooking')),
      handler: 'index.handler',
      environment: {
        TABLE_NAME: flightInfoTable.tableName,
      },
    });

    // Allow the Lambda function to access the DynamoDB table
    flightInfoTable.grantReadWriteData(registerBookingHandler);

    // Create an AWS Lambda function to send booking confirmation emails
    const sendBookingConfirmationHandler = new lambda.Function(this, 'SendBookingConfirmationHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda', 'sendbookingconfirmation')),
      handler: 'index.handler',
      environment: {
        SENDER_EMAIL: 'shashiishankar@gmail.com',
      },
    });

    // Allow the Lambda function to send emails using SES
    sendBookingConfirmationHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: ['*'],
      })
    );

    // Create an AWS Lambda function to sync available seats
const syncAvailableSeatsHandler = new lambda.Function(this, 'SyncAvailableSeatsHandler', {
  runtime: lambda.Runtime.PYTHON_3_8,
  code: lambda.Code.fromAsset(path.join(__dirname, 'lambda', 'syncavailableseats')),
  handler: 'index.handler',
  environment: {
    TABLE_NAME: flightInfoTable.tableName,
  },
});

// Allow the Lambda function to access and write to the DynamoDB table
flightInfoTable.grantWriteData(syncAvailableSeatsHandler);

// Create a scheduled rule to invoke the syncAvailableSeatsHandler Lambda function every day
const scheduleRule = new events.Rule(this, 'ScheduleRule', {
  schedule: events.Schedule.cron({ minute: '0', hour: '0' }), // Run every day at midnight UTC
});

scheduleRule.addTarget(new targets.LambdaFunction(syncAvailableSeatsHandler));


    // Create an Event Rule to trigger the Lambda function when a flight is booked
    const eventRule = new events.Rule(this, 'FlightBookingRule', {
      eventPattern: {
        source: ['custom.example'],
        detailType: ['FlightBooked'],
      },
    });

    eventRule.addTarget(new targets.LambdaFunction(registerBookingHandler));

  }}