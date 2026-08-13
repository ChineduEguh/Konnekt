export type PaymentRequest = {
  amountMinor: number;
  currency: string;
  reference: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
};
export type PaymentResult = {
  status: "pending" | "succeeded" | "failed";
  provider: string;
  providerReference?: string;
  checkoutUrl?: string;
};

export interface PaymentProvider {
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<PaymentResult>;
  refundPayment(
    reference: string,
    amountMinor?: number
  ): Promise<PaymentResult>;
  getPayment(reference: string): Promise<PaymentResult>;
  handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ accepted: boolean; reference?: string }>;
}

export class DeferredPaymentProvider implements PaymentProvider {
  async createPayment(): Promise<PaymentResult> {
    return {
      status: "failed",
      provider: "deferred",
      providerReference: "payment-provider-not-configured",
    };
  }
  async verifyPayment(): Promise<PaymentResult> {
    return {
      status: "failed",
      provider: "deferred",
      providerReference: "payment-provider-not-configured",
    };
  }
  async refundPayment(): Promise<PaymentResult> {
    return {
      status: "failed",
      provider: "deferred",
      providerReference: "payment-provider-not-configured",
    };
  }
  async getPayment(): Promise<PaymentResult> {
    return {
      status: "failed",
      provider: "deferred",
      providerReference: "payment-provider-not-configured",
    };
  }
  async handleWebhook(): Promise<{ accepted: boolean }> {
    return { accepted: false };
  }
}

export type WhatsAppMessage = {
  to: string;
  body: string;
  contactId?: number;
  metadata?: Record<string, string>;
};
export interface WhatsAppProvider {
  sendMessage(
    message: WhatsAppMessage
  ): Promise<{ accepted: boolean; providerMessageId?: string }>;
}
export class DeferredWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(): Promise<{ accepted: boolean }> {
    return { accepted: false };
  }
}

export type WorkspaceNotification = {
  workspaceId: number;
  type:
    | "click_milestone"
    | "event_sellout"
    | "payment_completed"
    | "abuse_threshold";
  title: string;
  body: string;
};
export async function notifyWorkspaceOwner(
  notification: WorkspaceNotification
) {
  console.info("[Konnekt notification]", notification.type, notification.title);
  return {
    delivered: false,
    reason: "notification-provider-not-configured",
  } as const;
}

export type WeeklyDigest = {
  workspaceId: number;
  periodStart: Date;
  periodEnd: Date;
  clicks: number;
  scans: number;
  registrations: number;
  revenueMinor: number;
  recipients: string[];
};
export async function compileWeeklyDigest(
  input: Omit<WeeklyDigest, "periodStart" | "periodEnd">
) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    ...input,
    periodStart,
    periodEnd,
    status: "prepared" as const,
    delivery: "deferred" as const,
  };
}
