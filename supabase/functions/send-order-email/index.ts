import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('Function started');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Resend API key from api_keys table
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('value')
      .eq('name', 'resend')
      .single();

    if (apiKeyError || !apiKeyData) {
      throw new Error('Failed to retrieve Resend API key');
    }

    const resend = new Resend(apiKeyData.value);

    const { email, orderNumber, status, items, total, shippingAddress, orderId } = await req.json();

    // Check for empty or invalid status
    if (typeof status !== 'string' || status.trim() === '') {
      throw new Error('Invalid or missing order status in request body.');
    }

    // Validate required fields
    if (!email || !orderNumber || !status) {
      throw new Error('Missing required fields: email, orderNumber, or status');
    }

    // Fetch user details to check admin status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
 .eq('email', email) // Assuming the email in the request corresponds to the user's email
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 is "No rows found"
      throw new Error(`Failed to retrieve user details: ${userError.message}`);
    }

    const isAdmin = userData?.is_admin === true;

    // Update order status in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to update order status: ${updateError.message}`);
    }

    let subject = '';
    let statusMessage = '';

    switch (status) {
      case 'processing':
        subject = `Order #${orderNumber} is being processed`;
        statusMessage = 'Your order is now being processed';
        break;
      case 'shipped':
        subject = `Order #${orderNumber} has been shipped`;
        statusMessage = 'Your order is on its way';
        break;
      case 'delivered':
        subject = `Order #${orderNumber} has been delivered`;
        statusMessage = 'Your order has been delivered';
        break;
      case 'cancelled':
        subject = `Order #${orderNumber} has been cancelled`;
        statusMessage = 'Your order has been cancelled';
        break;
      default:
        subject = `Update on your order #${orderNumber}`;
        statusMessage = `Your order status has been updated to: ${status}`;
    }

    // Create notification payload
    const notificationPayload = {
      orderNumber: orderNumber,
      statusMessage: statusMessage,
    };
    console.log('Notification Payload:', notificationPayload);

    // Handle empty or invalid items array
    const itemsList = Array.isArray(items) && items.length > 0
      ? items.map((item: any) => `
          <tr>
            <td style="padding: 12px;">${item.product?.name || 'Product name not available'}</td>
            <td style="padding: 12px;">Size: ${item.size || 'N/A'}, Color: ${item.color || 'N/A'}</td>
            <td style="padding: 12px;">${item.quantity || 0}</td>
            <td style="padding: 12px;">$${(item.product?.price || 0).toFixed(2)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="padding: 12px; text-align: center;">No items in order</td></tr>';

    // Handle undefined or missing shipping address
    const formattedAddress = shippingAddress
      ? `${shippingAddress.fullName || 'No name provided'}<br>
         ${shippingAddress.streetAddress || 'No street address provided'}<br>
         ${shippingAddress.city || 'No city provided'}, 
         ${shippingAddress.state || 'No state provided'} 
         ${shippingAddress.postalCode || 'No postal code provided'}<br>
         ${shippingAddress.country || 'No country provided'}`
      : 'Shipping address not provided';

    // Log the subject and HTML body before sending
    console.log('Email Subject:', subject);

    console.log('Final subject before sending:', subject);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Stylish <onboarding@resend.dev>', // Replace with your verified Resend domain
      to: [email],
      subject: 'Test Subject - Order Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e293b; margin-bottom: 24px;">${statusMessage}</h1>
          
          <p style="color: #475569; margin-bottom: 24px;">
            Order #${orderNumber}<br>
            Status: <strong>${status.charAt(0).toUpperCase() + status.slice(1)}</strong>
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead style="background-color: #f8fafc;">
              <tr>
                <th style="padding: 12px; text-align: left;">Product</th>
                <th style="padding: 12px; text-align: left;">Details</th>
                <th style="padding: 12px; text-align: left;">Quantity</th>
                <th style="padding: 12px; text-align: left;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>

          <div style="margin-bottom: 24px;">
            <p style="font-weight: bold; color: #1e293b;">Total: $${(total || 0).toFixed(2)}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 18px;">Shipping Address</h2>
            <p style="color: #475569;">
 ${formattedAddress}
            </p>
          </div>

          <div style="color: #64748b; font-size: 14px; margin-top: 32px;">
            <p>Thank you for shopping with Stylish!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>`,
    });

    if (!isAdmin) {
      if (emailError) {
        // Log the email error specifically
      console.error('Resend API error:', emailError);
      throw emailError;
      }
    } else {
      console.log(`Email not sent to admin user: ${email}`);
    }

    const successMessage = isAdmin ? 'Order status updated. Email not sent to admin user.' : 'Order status updated and email sent successfully.';

    return new Response(
      JSON.stringify({ 
 message: successMessage,
 data: isAdmin ? null : emailData,
      }),
      { 
        headers: { 
 ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    );
  } catch (error) {
    console.error('Error processing order status update:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    );
  }
});