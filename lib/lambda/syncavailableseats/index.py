import boto3
import datetime

def handler(event, context):
    # Get the current date
    current_date = datetime.datetime.now().strftime('%Y-%m-%d')

    # Update the flightInfo table for each destination with the current date and available seats as 10
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(event['TABLE_NAME'])  # Read the TABLE_NAME from the environment variable

    # Scan the table to get all existing destinations
    response = table.scan(ProjectionExpression='destination')

    # Update each row with the current date and available seats as 10
    for item in response['Items']:
        destination = item['destination']
        table.update_item(
            Key={
                'destination': destination,
                'date': current_date
            },
            UpdateExpression='SET available_seats = :seats',
            ExpressionAttributeValues={
                ':seats': 10
            }
        )

    return {
        'statusCode': 200,
        'body': 'Synced available seats successfully.'
    }
