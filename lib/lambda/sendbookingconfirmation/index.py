import boto3
import os

def handler(event, context):
    # Retrieve input parameters from the event body
    print(event)
    body = event['detail']
    destination = body['destination']
    reserved_seats = body['reserved_seats']
    useremail = body['useremail']

    # Create the email body
    email_body = f"Thank you for booking your flight to {destination}. You have reserved {reserved_seats} seat(s)."

    # Send the email using Amazon SES
    ses_client = boto3.client('ses')
    response = ses_client.send_email(
        Source=os.environ['SENDER_EMAIL'],
        Destination={
            'ToAddresses': [useremail]
        },
        Message={
            'Subject': {
                'Data': 'Flight Booking Confirmation'
            },
            'Body': {
                'Text': {
                    'Data': email_body
                }
            }
        }
    )

    return {
        'statusCode': 200,
        'body': 'Booking confirmation email sent.'
    }
