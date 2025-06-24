import React, { useState } from 'react';
import pesapalService from '../lib/pesapal';
import { getPesapalConfig } from '../lib/config';
import toast from 'react-hot-toast';

const PaymentTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testPesapalConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing Pesapal connection...');

    try {
      // Test authentication (will use development mode)
      const token = await (pesapalService as any).getAccessToken();
      
      if (token) {
        setTestResult('✅ Development mode: Authentication simulated successfully!\n\nNote: This is running in development mode with simulated responses. For production, you\'ll need a backend proxy to handle real Pesapal API calls.');
        toast.success('Pesapal connection test passed (Development Mode)');
      } else {
        setTestResult('❌ Failed to get access token');
        toast.error('Pesapal connection test failed');
      }
    } catch (error: any) {
      setTestResult(`❌ Connection failed: ${error.message}`);
      toast.error('Pesapal connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const showConfig = () => {
    const config = getPesapalConfig();
    setTestResult(`Current Configuration:
Base URL: ${config.baseUrl}
Consumer Key: ${config.consumerKey ? '✅ Set' : '❌ Not set'}
Consumer Secret: ${config.consumerSecret ? '✅ Set' : '❌ Not set'}
M-Pesa Receiver: ${config.partyC ? '✅ Set' : '❌ Not set'}
Environment: ${config.baseUrl.includes('cybqa') ? 'Sandbox' : 'Production'}

Development Mode: ✅ Active
Note: Using simulated responses for testing. Real API calls require a backend proxy.`);
  };

  const testPaymentFlow = async () => {
    setIsLoading(true);
    setTestResult('Testing payment flow...');

    try {
      // Test M-Pesa payment initiation
      const mpesaResponse = await pesapalService.initiateMpesaPayment({
        amount: 1000,
        phoneNumber: '254708374149',
        orderNumber: 'TEST_ORDER_' + Date.now(),
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '254708374149',
        description: 'Test payment'
      });

      if (mpesaResponse.success) {
        setTestResult(`✅ Payment flow test successful!

M-Pesa Payment:
- Status: ${mpesaResponse.success ? 'Success' : 'Failed'}
- Message: ${mpesaResponse.message}
- Transaction ID: ${mpesaResponse.transactionId}
- Checkout URL: ${mpesaResponse.checkoutUrl}

Development Mode: All responses are simulated for testing purposes.`);
        toast.success('Payment flow test passed');
      } else {
        setTestResult(`❌ Payment flow test failed: ${mpesaResponse.message}`);
        toast.error('Payment flow test failed');
      }
    } catch (error: any) {
      setTestResult(`❌ Payment flow test failed: ${error.message}`);
      toast.error('Payment flow test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testMpesaPayment = async () => {
    setIsLoading(true);
    setTestResult('Testing M-Pesa payment...');

    try {
      const mpesaResponse = await pesapalService.initiateMpesaPayment({
        amount: 1500,
        phoneNumber: '254708374149',
        orderNumber: 'MPESA_TEST_' + Date.now(),
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '254708374149',
        description: 'M-Pesa test payment'
      });

      if (mpesaResponse.success) {
        setTestResult(`✅ M-Pesa Payment Test Successful!

Details:
- Amount: KES 1,500
- Phone: 254708374149
- Order: ${mpesaResponse.transactionId}
- Status: ${mpesaResponse.message}
- Checkout URL: ${mpesaResponse.checkoutUrl}

Next: Click the checkout URL to test the complete flow.`);
        toast.success('M-Pesa payment test passed');
      } else {
        setTestResult(`❌ M-Pesa payment test failed: ${mpesaResponse.message}`);
        toast.error('M-Pesa payment test failed');
      }
    } catch (error: any) {
      setTestResult(`❌ M-Pesa payment test failed: ${error.message}`);
      toast.error('M-Pesa payment test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testCardPayment = async () => {
    setIsLoading(true);
    setTestResult('Testing Card payment...');

    try {
      const cardResponse = await pesapalService.initiateCardPayment({
        amount: 2500,
        orderNumber: 'CARD_TEST_' + Date.now(),
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        customerPhone: '254708374149',
        description: 'Card test payment',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'Jane Smith'
      });

      if (cardResponse.success) {
        setTestResult(`✅ Card Payment Test Successful!

Details:
- Amount: KES 2,500
- Card: Visa ****1111
- Order: ${cardResponse.transactionId}
- Status: ${cardResponse.message}
- Checkout URL: ${cardResponse.checkoutUrl}

Next: Click the checkout URL to test the complete flow.`);
        toast.success('Card payment test passed');
      } else {
        setTestResult(`❌ Card payment test failed: ${cardResponse.message}`);
        toast.error('Card payment test failed');
      }
    } catch (error: any) {
      setTestResult(`❌ Card payment test failed: ${error.message}`);
      toast.error('Card payment test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testBothPayments = async () => {
    setIsLoading(true);
    setTestResult('Testing both payment methods...');

    try {
      // Test M-Pesa
      const mpesaResponse = await pesapalService.initiateMpesaPayment({
        amount: 1000,
        phoneNumber: '254708374149',
        orderNumber: 'BOTH_TEST_MPESA_' + Date.now(),
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '254708374149',
        description: 'M-Pesa test'
      });

      // Test Card
      const cardResponse = await pesapalService.initiateCardPayment({
        amount: 2000,
        orderNumber: 'BOTH_TEST_CARD_' + Date.now(),
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '254708374149',
        description: 'Card test',
        cardNumber: '5555555555554444',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'Test User'
      });

      if (mpesaResponse.success && cardResponse.success) {
        setTestResult(`✅ Both Payment Methods Test Successful!

M-Pesa Payment:
- Amount: KES 1,000
- Status: ${mpesaResponse.message}
- Transaction ID: ${mpesaResponse.transactionId}

Card Payment:
- Amount: KES 2,000
- Status: ${cardResponse.message}
- Transaction ID: ${cardResponse.transactionId}

Both payment methods are working correctly in development mode!`);
        toast.success('Both payment methods test passed');
      } else {
        setTestResult(`❌ Some payment tests failed:
M-Pesa: ${mpesaResponse.success ? '✅' : '❌'}
Card: ${cardResponse.success ? '✅' : '❌'}`);
        toast.error('Some payment tests failed');
      }
    } catch (error: any) {
      setTestResult(`❌ Payment tests failed: ${error.message}`);
      toast.error('Payment tests failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Pesapal Integration Test</h3>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="font-semibold text-blue-800">Development Mode Active</p>
        <p className="text-blue-700">All API calls are simulated for testing. Real integration requires a backend proxy.</p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={showConfig}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Show Configuration
        </button>
        
        <button
          onClick={testPesapalConnection}
          disabled={isLoading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          onClick={testPaymentFlow}
          disabled={isLoading}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Payment Flow'}
        </button>
        
        <button
          onClick={testMpesaPayment}
          disabled={isLoading}
          className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test M-Pesa Payment'}
        </button>
        
        <button
          onClick={testCardPayment}
          disabled={isLoading}
          className="w-full bg-pink-500 text-white py-2 px-4 rounded hover:bg-pink-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Card Payment'}
        </button>
        
        <button
          onClick={testBothPayments}
          disabled={isLoading}
          className="w-full bg-teal-500 text-white py-2 px-4 rounded hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Both Payment Methods'}
        </button>
        
        {testResult && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm whitespace-pre-line">
            {testResult}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-xs text-gray-600">
        <p><strong>Note:</strong> This component is for testing purposes only.</p>
        <p>Remove it before production deployment.</p>
        <p className="mt-2"><strong>Next Steps:</strong></p>
        <ul className="list-disc list-inside mt-1">
          <li>Test the complete checkout flow</li>
          <li>Set up a backend proxy for production</li>
          <li>Update environment variables</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentTest; 