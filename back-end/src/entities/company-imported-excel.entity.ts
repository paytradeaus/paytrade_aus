import { Column, Entity, Generated, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ImportedCompanyExcel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  company_name: string;

  @Column({ type: 'varchar', length: 100 })
  company_email_id: string;

  @Column({ type: 'varchar', length: 20 })
  company_phone_no: string;

  @Column({ type: 'integer', unique: true, nullable: true  })
  company_id: number;

  @Column({ default: false, nullable: true })
  is_verified: Boolean;
}