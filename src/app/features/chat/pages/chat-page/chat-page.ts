import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { interval, map, of, switchMap } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../service/chat-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { CitaService } from '../../../citas/service/cita-service';
import { AuthService } from '../../../../core/services/auth-service';
import { ChatMessageDTO, ChatContact } from '../../interfaces/chat.interface';
import { UserRole } from '../../../../core/interfaces/auth-response';

@Component({
  selector: 'app-chat-page',
  imports: [FormsModule],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLElement>;

  private readonly chatService = inject(ChatService);
  private readonly pacienteService = inject(PacienteService);
  private readonly citaService = inject(CitaService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly currentUserId = this.authService.userId;
  protected readonly currentUserRole = this.authService.currentUserRole;

  protected readonly contacts = signal<ChatContact[]>([]);
  protected readonly selectedContact = signal<ChatContact | null>(null);

  protected readonly messages = signal<ChatMessageDTO[]>([]);
  protected readonly newMessage = signal('');
  protected readonly isLoadingHistory = signal(false);
  protected readonly isConnected = this.chatService.isConnected;

  private shouldScrollToBottom = false;

  protected readonly isNutriologo = computed(
    () => this.currentUserRole() === UserRole.NUTRIOLOGO,
  );

  ngOnInit(): void {
    const userId = this.currentUserId();
    if (!userId) return;

    this.chatService.connect((msg) => {
      const selected = this.selectedContact();
      const myId = this.currentUserId();
      if (!myId) return;

      const isRelevant =
        (Number(msg.senderId) === Number(selected?.id) && Number(msg.recipientId) === Number(myId)) ||
        (Number(msg.senderId) === Number(myId) && Number(msg.recipientId) === Number(selected?.id));

      if (isRelevant) {
        this.messages.update((prev) => [...prev, msg]);
        this.shouldScrollToBottom = true;
        this.cdr.markForCheck();
      }
    });

    // Polling de respaldo: recarga el historial cada 5 s por si el WebSocket
    // pierde algún mensaje o no dispara el change detection correctamente.
    interval(3000).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(() => {
        const contact = this.selectedContact();
        const myId = this.currentUserId();
        if (!contact || !myId) return of([] as ChatMessageDTO[]);
        return this.chatService.getChatHistory(myId, contact.id);
      }),
    ).subscribe(msgs => {
      if (!msgs.length) return;
      if (msgs.length > this.messages().length) {
        this.messages.set(msgs);
        this.shouldScrollToBottom = true;
        this.cdr.markForCheck();
      }
    });

    const targetContactId = Number(
      this.route.snapshot.queryParamMap.get('pacienteId') ||
      this.route.snapshot.queryParamMap.get('usuarioId')
    );

    if (this.isNutriologo()) {
      this.pacienteService
        .obtenerPacientes(0, 200)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((page) => {
          const list: ChatContact[] = page.content.map(p => ({
            id: p.id!,
            nombre: p.nombre,
            apellidoPaterno: p.apellidoPaterno,
            apellidoMaterno: p.apellidoMaterno,
          }));
          this.contacts.set(list);

          if (targetContactId) {
            const found = list.find(c => Number(c.id) === targetContactId);
            if (found) {
              this.selectContact(found);
            }
          }
        });
    } else {
      // PACIENTE: Intenta obtener el nutriólogo del perfil del paciente.
      this.pacienteService
        .obtenerPacientePorId(userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (paciente) => {
            if (paciente.nutriologoId) {
              const contact: ChatContact = {
                id: paciente.nutriologoId!,
                nombre: paciente.nombreNutriologo || 'Nutriólogo',
                apellidoPaterno: paciente.apellidoPaternoNutriologo || '',
              };
              this.contacts.set([contact]);
              this.selectContact(contact);
            } else {
              this.cargarNutriologoDesdeCitas(userId);
            }
          },
          error: () => {
            this.cargarNutriologoDesdeCitas(userId);
          },
        });
    }
  }

  private cargarNutriologoDesdeCitas(userId: number): void {
    this.citaService
      .obtenerCitasPorPaciente(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((citas) => {
          const cita = citas[0];
          if (!cita?.nutriologoId) throw new Error('Sin nutriólogo asignado');
          return cita;
        }),
      )
      .subscribe({
        next: (cita) => {
          const [nombre = '', apellidoPaterno = '', apellidoMaterno] =
            cita.nombreNutriologo.split(' ');
          const contact: ChatContact = {
            id: cita.nutriologoId,
            nombre,
            apellidoPaterno,
            apellidoMaterno,
          };
          this.contacts.set([contact]);
          this.selectContact(contact);
        },
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
  }

  protected selectContact(contact: ChatContact): void {
    this.selectedContact.set(contact);
    this.messages.set([]);
    this.loadHistory(contact);
  }

  private loadHistory(contact: ChatContact): void {
    const myId = this.currentUserId();
    if (!myId) return;

    this.isLoadingHistory.set(true);
    this.chatService
      .getChatHistory(myId, contact.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msgs) => {
          this.messages.set(msgs);
          this.isLoadingHistory.set(false);
          this.shouldScrollToBottom = true;
        },
        error: () => this.isLoadingHistory.set(false),
      });
  }

  protected send(): void {
    const content = this.newMessage().trim();
    const myId = this.currentUserId();
    const recipient = this.selectedContact();

    if (!content || !myId || !recipient) return;

    const msg: ChatMessageDTO = {
      chatId: '',
      senderId: myId,
      recipientId: recipient.id,
      content,
      timestamp: new Date().toISOString(),
    };

    this.chatService.sendMessage(msg);
    this.messages.update((prev) => [...prev, msg]);
    this.newMessage.set('');
    this.shouldScrollToBottom = true;
  }

  protected isMine(msg: ChatMessageDTO): boolean {
    return Number(msg.senderId) === Number(this.currentUserId());
  }

  protected formatTime(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  protected onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  protected getInitials(contact: ChatContact): string {
    const first = contact.nombre?.charAt(0).toUpperCase() ?? '';
    const last = contact.apellidoPaterno?.charAt(0).toUpperCase() ?? '';
    return first + last;
  }

  protected fullName(contact: ChatContact): string {
    return [contact.nombre, contact.apellidoPaterno, contact.apellidoMaterno]
      .filter(Boolean)
      .join(' ');
  }

  protected updateMessage(value: string): void {
    this.newMessage.set(value);
  }
}
