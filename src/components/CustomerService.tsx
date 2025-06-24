import React from 'react';
import { X, Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';

interface CustomerServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomerService: React.FC<CustomerServiceProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Customer Service</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Contact Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Phone Support */}
            <div className="bg-blue-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
              </div>
              <p className="text-gray-600 mb-2">Available 24/7 for immediate assistance</p>
              <a href="tel:1-800-TECHMART" className="text-blue-600 font-semibold hover:text-blue-700">
                1-800-TECHMART
              </a>
            </div>

            {/* Email Support */}
            <div className="bg-green-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
              </div>
              <p className="text-gray-600 mb-2">Get a response within 24 hours</p>
              <a href="mailto:support@techmart.com" className="text-green-600 font-semibold hover:text-green-700">
                support@techmart.com
              </a>
            </div>

            {/* Live Chat */}
            <div className="bg-purple-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Live Chat</h3>
              </div>
              <p className="text-gray-600 mb-2">Chat with our support team</p>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Start Chat
              </button>
            </div>

            {/* Store Location */}
            <div className="bg-orange-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Visit Our Store</h3>
              </div>
              <p className="text-gray-600 mb-2">123 Tech Street, Silicon Valley</p>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Mon-Sat: 9AM-8PM</span>
              </div>
            </div>
          </div>

          {/* Common Issues */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Common Issues</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <h4 className="font-medium text-gray-900">How do I track my order?</h4>
                <p className="text-gray-600 text-sm mt-1">Get real-time updates on your shipment status</p>
              </button>
              <button className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <h4 className="font-medium text-gray-900">Return Policy</h4>
                <p className="text-gray-600 text-sm mt-1">Learn about our 30-day return policy</p>
              </button>
              <button className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <h4 className="font-medium text-gray-900">Warranty Information</h4>
                <p className="text-gray-600 text-sm mt-1">Details about product warranties and coverage</p>
              </button>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="text-center">
            <p className="text-gray-600 mb-2">Can't find what you're looking for?</p>
            <a href="#" className="text-blue-600 font-semibold hover:text-blue-700">
              Visit our FAQ page →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerService; 