import { ActionButtonType, BankAccountType, ComplianceChecksOfPTA, ComplianceChecksOfRTA } from 'src/libs/@paytrade-types/paytrade-types';
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class ComplianceCheckpoint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    project_id: number;

    @Column({
        type: 'enum',
        enum: ['Project Trust Account', 'Retention Trust Account'],
        nullable: true,
    })
    bank_account_type: BankAccountType;

    @Column({ type: 'int' })
    check_number: number;

    @Column({ type: 'varchar' })
    check_name: ComplianceChecksOfRTA | ComplianceChecksOfPTA;

    @Column({ type: 'varchar', nullable: true })
    check_colour_code: string;

    @Column({ type: 'boolean', default: true })
    mails: boolean;

    // Task #297 — Compliance cache freshness.
    // `is_stale` is flipped to true by `ComplianceRefreshProducer.markDirty`
    // whenever a user action could have changed the evaluation of any rule
    // on this project (payment confirmed, contract uploaded, notice sent,
    // trust top-up, etc). The refresh worker — and the read-time safety
    // net in `getComplianceData` — set it back to false after a successful
    // resync. `last_synced_at` records the wall-clock time of that resync.
    @Column({ type: 'boolean', default: true })
    is_stale: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    last_synced_at: Date | null;

    @OneToMany(() => ComplianceRule, (rule) => rule.checkpoint, { cascade: true })
    rules: ComplianceRule[];
}

@Entity()
export class ComplianceRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    project_id: number;

    @ManyToOne(() => ComplianceCheckpoint, (cp) => cp.rules, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'checkpoint_id' })
    checkpoint: ComplianceCheckpoint;

    @Column({ type: 'uuid' })
    checkpoint_id: string;

    @Column({ type: 'int' })
    rule_number: number;

    @Column({ type: 'varchar' })
    check_name: ComplianceChecksOfRTA | ComplianceChecksOfPTA;

    @Column({ type: 'varchar', nullable: true })
    check_status: string;

    @Column({
        type: 'enum',
        enum: [
            'EDIT_PROJECT',
            'ADD_BANK_ACCOUNT',
            'EDIT_BANK_ACCOUNT',
            'NONE',
            'MATCH_TRANSACTIONS',
            'ADD_CONTRACT',
            'EDIT_CONTRACT',
            'SEND_NOTICE',
            'RECONCILE',
            'REVIEW_AUDIT',
            'VIEW_UNMATCHED_PAYMENTS',
            'SEND_SCHEDULE',
            'UPDATE_TRANSACTION_LIST',
            'TOPUP_ACCOUNT',
            'SEND_REMITTANCE',
            'WITHDRAW_BALANCE',
            'UPDATE_AND_MATCH',
            'PAY_NOW',
            'DELEGATE_NOW',
            'UPLOAD_CERTIFICATE',
            'VIEW_PAYMENTS',
            'VIEW_CLAIMS',
            'VIEW_CLAIMS_AND_PAYMENTS'
        ],
        nullable: true,
    })
    action_button_type: ActionButtonType;

    @Column({ type: 'varchar', nullable: true })
    display_message_colour: string;

    @Column({ type: 'text', nullable: true })
    display_message: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'varchar', nullable: true })
    reference_id: string;

    @Column({ type: 'boolean', default: true })
    notify: boolean;
}

