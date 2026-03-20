import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Service d'envoi d'emails via plusieurs providers
 * Supporte SendGrid, Mailgun, AWS SES
 * 
 * Note: Les packages @sendgrid/mail, mailgun.js et aws-sdk doivent être installés
 * dans le package.json du frontend pour être disponibles dans les fonctions serverless
 */

interface EmailData {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

/**
 * Envoie un email via SendGrid
 */
async function sendViaSendGrid(emailData: EmailData): Promise<EmailResult> {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendGridApiKey) {
    throw new Error('SENDGRID_API_KEY non configurée');
  }

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(sendGridApiKey);

  const msg = {
    to: emailData.to,
    from: emailData.from,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text || (emailData.html ? emailData.html.replace(/<[^>]*>/g, '') : ''),
    cc: emailData.cc,
    bcc: emailData.bcc,
    replyTo: emailData.replyTo || emailData.from,
    attachments: emailData.attachments?.map(att => ({
      content: att.content,
      filename: att.filename,
      type: att.contentType || 'application/octet-stream',
      disposition: 'attachment',
    })),
  };

  try {
    const [response] = await sgMail.send(msg);
    return {
      success: true,
      messageId: response.headers['x-message-id'] || undefined,
      provider: 'sendgrid',
    };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    throw new Error(`SendGrid: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Envoie un email via Mailgun
 */
async function sendViaMailgun(emailData: EmailData): Promise<EmailResult> {
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  
  if (!mailgunApiKey || !mailgunDomain) {
    throw new Error('MAILGUN_API_KEY ou MAILGUN_DOMAIN non configurées');
  }

  const formData = require('form-data');
  const Mailgun = require('mailgun.js');
  const mailgun = new Mailgun(formData);
  const client = mailgun.client({
    username: 'api',
    key: mailgunApiKey,
  });

  const messageData = {
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text || (emailData.html ? emailData.html.replace(/<[^>]*>/g, '') : ''),
    cc: emailData.cc?.join(','),
    bcc: emailData.bcc?.join(','),
    'h:Reply-To': emailData.replyTo || emailData.from,
  };

  // Gérer les pièces jointes pour Mailgun
  const attachments = emailData.attachments?.map(att => ({
      filename: att.filename,
      data: Buffer.from(att.content, 'base64'),
    })) || [];

  try {
    const response = await client.messages.create(mailgunDomain, {
      ...messageData,
      attachment: attachments,
    });

    return {
      success: true,
      messageId: response.id,
      provider: 'mailgun',
    };
  } catch (error: any) {
    console.error('Mailgun error:', error);
    throw new Error(`Mailgun: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Envoie un email via AWS SES
 */
async function sendViaSES(emailData: EmailData): Promise<EmailResult> {
  const awsAccessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_SES_REGION || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS_SES_ACCESS_KEY_ID ou AWS_SES_SECRET_ACCESS_KEY non configurées');
  }

  const AWS = require('aws-sdk');
  AWS.config.update({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
  });

  const ses = new AWS.SES({ apiVersion: '2010-12-01' });

  const params = {
    Source: emailData.from,
    Destination: {
      ToAddresses: [emailData.to],
      CcAddresses: emailData.cc || [],
      BccAddresses: emailData.bcc || [],
    },
    Message: {
      Subject: {
        Data: emailData.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: emailData.html ? {
          Data: emailData.html,
          Charset: 'UTF-8',
        } : undefined,
        Text: emailData.text ? {
          Data: emailData.text,
          Charset: 'UTF-8',
        } : {
          Data: emailData.html ? emailData.html.replace(/<[^>]*>/g, '') : '',
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: emailData.replyTo ? [emailData.replyTo] : [emailData.from],
  };

  try {
    const response = await ses.sendEmail(params).promise();
    return {
      success: true,
      messageId: response.MessageId,
      provider: 'ses',
    };
  } catch (error: any) {
    console.error('AWS SES error:', error);
    throw new Error(`AWS SES: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Fonction principale qui essaie d'envoyer via les providers disponibles
 * Essaie dans l'ordre: SendGrid -> Mailgun -> SES
 */
async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  const providers = [
    { name: 'sendgrid', fn: sendViaSendGrid },
    { name: 'mailgun', fn: sendViaMailgun },
    { name: 'ses', fn: sendViaSES },
  ];

  for (const provider of providers) {
    try {
      // Vérifier si le provider est configuré
      if (provider.name === 'sendgrid' && !process.env.SENDGRID_API_KEY) continue;
      if (provider.name === 'mailgun' && (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN)) continue;
      if (provider.name === 'ses' && (!process.env.AWS_SES_ACCESS_KEY_ID || !process.env.AWS_SES_SECRET_ACCESS_KEY)) continue;

      const result = await provider.fn(emailData);
      console.log(`Email envoyé via ${provider.name}:`, result.messageId);
      return result;
    } catch (error: any) {
      console.warn(`Échec avec ${provider.name}:`, error.message);
      // Continuer avec le provider suivant
      continue;
    }
  }

  throw new Error('Aucun provider email configuré ou tous les providers ont échoué');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const emailData: EmailData = req.body;

    // Validation des champs requis
    if (!emailData.to || !emailData.from || !emailData.subject) {
      return res.status(400).json({ 
        error: 'Champs requis manquants: to, from, subject' 
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to) || !emailRegex.test(emailData.from)) {
      return res.status(400).json({ 
        error: 'Format email invalide' 
      });
    }

    // Envoyer l'email
    const result = await sendEmail(emailData);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur lors de l\'envoi de l\'email',
      success: false,
    });
  }
}

