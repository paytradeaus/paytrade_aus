import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { jwtConstants } from 'src/api/auth/constants';

export function AuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const jwtService = new JwtService({
    secret: jwtConstants.secret || 'secret_key',
  });

  try {
    const token =
      req?.headers?.authorization?.split(' ')?.[1] ||
      (req?.query?.token as string);

    const queryToken = req.query.token as string;

    if (!token && !queryToken) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const decoded = jwtService.verify(token);
    (req as any).user = decoded;

    console.log('decoded: ', decoded);
    next();
  } catch (err) {
    console.log('err: ', err?.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
