import boto3
import os
import json

def handler(event, context):
    # Retrieve input parameters from the event
    print(event)
    body=json.loads(event['body'])
    destination = body['destination']
    date = body['date']
    requested_seats = int(body['requested_seats'])
    useremail = body['useremail']

    # Check if there are enough available seats
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['TABLE_NAME'])
    response = table.get_item(Key={'destination': destination, 'date': date})
    print(response)
    if 'Item' in response:
        available_seats = response['Item']['available_seats']
        if available_seats >= requested_seats:
            # Publish event to the custom event bus
            eventbridge = boto3.client('events')
            eventbridge.put_events(
                Entries=[
                    {
                        'Source': 'custom.example',
                        'DetailType': 'FlightBooked',
                        'Detail': json.dumps({
                            'destination': destination,
                            'date': date,
                            'reserved_seats': requested_seats,
                            'useremail': useremail
                        })
                    }
                ]
            )
            return {
                'statusCode': 200,
                'body': 'Flight booking successful.'
            }
    return {
        'statusCode': 400,
        'body': 'Insufficient seats available.'
    }
