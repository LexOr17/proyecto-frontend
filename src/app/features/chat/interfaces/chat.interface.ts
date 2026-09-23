export interface ChatMessageDTO {
  chatId: string;
  senderId: number;
  recipientId: number;
  content: string;
  timestamp: string;
}

export interface ChatContact {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
}
