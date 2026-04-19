import { io } from "socket.io-client";
import { resolveSignalingBase } from "./backend-url";

export const socket = io(resolveSignalingBase());
