import { Entity, ManyToOne, Column, PrimaryGeneratedColumn } from "typeorm";

import { User } from "./user";

@Entity()
export class UserAuthenticator {
  @PrimaryGeneratedColumn()
  public id: string;

  @ManyToOne(() => User, (user) => user.authenticators)
  public user: User;

  @Column({ type: "json" })
  public authenticator: any;
}
