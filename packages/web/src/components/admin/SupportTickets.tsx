import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'other';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  responses: TicketResponse[];
}

interface TicketResponse {
  id: string;
  message: string;
  isFromUser: boolean;
  authorName: string;
  createdAt: string;
  attachments?: string[];
}

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSupportTickets({
        status: filterStatus === 'all' ? undefined : filterStatus,
        priority: filterPriority === 'all' ? undefined : filterPriority,
      });
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch support tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketAction = async (ticketId: string, action: 'assign' | 'resolve' | 'close', assignee?: string) => {
    try {
      await adminService.updateTicketStatus(ticketId, action, assignee);
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = tickets.find(t => t.id === ticketId);
        if (updatedTicket) setSelectedTicket(updatedTicket);
      }
    } catch (error) {
      console.error(`Failed to ${action} ticket:`, error);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseMessage.trim()) return;

    try {
      setSendingResponse(true);
      await adminService.respondToTicket(selectedTicket.id, responseMessage);
      setResponseMessage('');
      await fetchTickets();
      // Refresh selected ticket
      const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) setSelectedTicket(updatedTicket);
    } catch (error) {
      console.error('Failed to send response:', error);
    } finally {
      setSendingResponse(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Support Tickets</h2>
        <p className="text-gray-600">Manage customer support requests and communications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          {/* Filters */}
          <div className="mb-4 space-y-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Open Tickets</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="all">All Status</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Tickets */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-pulse">Loading tickets...</div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No tickets found
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        #{ticket.ticketNumber}
                      </span>
                      <div className="flex space-x-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {ticket.subject}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2 truncate">
                      {ticket.userEmail}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white border border-gray-200 rounded-lg">
              {/* Ticket Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      #{selectedTicket.ticketNumber}: {selectedTicket.subject}
                    </h3>
                    <p className="text-sm text-gray-600">
                      From: {selectedTicket.userEmail} • Category: {selectedTicket.category}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  {selectedTicket.status === 'open' && (
                    <button
                      onClick={() => handleTicketAction(selectedTicket.id, 'assign', 'current_admin')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Assign to Me
                    </button>
                  )}
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => handleTicketAction(selectedTicket.id, 'resolve')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => handleTicketAction(selectedTicket.id, 'close')}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Conversation */}
              <div className="p-6">
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {/* Original Message */}
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {selectedTicket.userEmail.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTicket.userEmail}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(selectedTicket.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Responses */}
                  {selectedTicket.responses.map((response) => (
                    <div key={response.id} className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          response.isFromUser ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {response.authorName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`rounded-lg p-4 ${
                          response.isFromUser ? 'bg-gray-50' : 'bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {response.authorName}
                              {!response.isFromUser && (
                                <span className="ml-1 text-xs text-green-600">(Support)</span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(response.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{response.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Response Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-3">
                      <textarea
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Type your response..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSendResponse}
                          disabled={!responseMessage.trim() || sendingResponse}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingResponse ? 'Sending...' : 'Send Response'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Ticket</h3>
              <p className="text-gray-600">Choose a ticket from the list to view details and respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};