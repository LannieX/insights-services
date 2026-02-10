import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Response } from 'express'

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let message = 'Database error'
    let status = HttpStatus.BAD_REQUEST

    switch (exception.code) {
      case 'P2002':
        message = 'Duplicate data'
        status = HttpStatus.CONFLICT
        break
      case 'P2025':
        message = 'Data not found'
        status = HttpStatus.NOT_FOUND
        break
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: exception.meta,
    })
  }
}
