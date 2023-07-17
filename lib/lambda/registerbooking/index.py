import boto3
import os

def handler(event, context):
    # Retrieve input parameters from the event body
    print(event)
    body = event['detail']
    destination = body['destination']
    date = body['date']
    reserved_seats = body['reserved_seats']

    # Update the flightInfo table
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['TABLE_NAME'])
    response = table.update_item(
        Key={
            'destination': destination,
            'date': date
        },
        UpdateExpression='SET available_seats = available_seats - :seats',
        ExpressionAttributeValues={
            ':seats': reserved_seats
        }
    )

    return {
        'statusCode': 200,
        'body': 'Booking registered successfully.'
    }
