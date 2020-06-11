import { Entity, Column, OneToMany, PrimaryColumn } from "typeorm";

import { UserAuthenticator } from "./userAuthenticator";

@Entity()
export class User {
  @PrimaryColumn({ type: "uuid" })
  public id: string;

  @Column({ unique: true })
  public username: string;

  @Column()
  public displayName: string;

  @Column()
  public password: string;

  @OneToMany(
    () => UserAuthenticator,
    (userAuthenticator) => userAuthenticator.user,
    { eager: true, cascade: ["insert", "update"] }
  )
  public authenticators?: UserAuthenticator[];
}
