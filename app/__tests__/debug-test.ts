import { NextRequest } from 'next/server';
import { POST as appendPost } from '../src/app/api/track/append/route';
import { POST as eventPost } from '../src/app/api/track/event/route';

interface MockRequestBody {
  page_id?: string;
  duration_seconds?: number;
  event_name?: string;
  session_id?: string;
  path?: string;
  timestamp?: string;
}

const createMockRequest = (body: MockRequestBody) => {
  return new NextRequest('http://localhost:3000/api/track', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

(async () => {
  const appendPayload = {
    page_id: 'clm9876543210zyxwvutsrqpo9',
    duration_seconds: 30,
  };

  const appendReq = createMockRequest(appendPayload);
  const appendRes = await appendPost(appendReq);
  const appendData = await appendRes.json();
  console.log('Append Status:', appendRes.status);
  console.log('Append Response:', JSON.stringify(appendData, null, 2));

  const eventPayload = {
    event_name: 'button_click',
    page_id: 'cxn3456789012abcdefghijklm',
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    path: '/test',
    timestamp: '2025-10-25T10:00:00.000Z',
  };

  const eventReq = createMockRequest(eventPayload);
  const eventRes = await eventPost(eventReq);
  const eventData = await eventRes.json();
  console.log('Event Status:', eventRes.status);
  console.log('Event Response:', JSON.stringify(eventData, null, 2));
})();
