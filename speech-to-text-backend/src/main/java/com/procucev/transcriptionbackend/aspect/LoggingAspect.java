package com.procucev.transcriptionbackend.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Aspect for logging method entry, exit, execution arguments, and duration
 * across all Spring components in the controller and service packages.
 */
@Aspect
@Component
@Slf4j
public class LoggingAspect {

    /**
     * Pointcut that matches all methods within controller and service packages.
     */
    @Pointcut("within(com.procucev.transcriptionbackend.controller..*) || within(com.procucev.transcriptionbackend.service..*)")
    public void applicationPackagePointcut() {
        // Pointcut marker method
    }

    /**
     * Around advice to log entry, execution arguments, duration, and exit.
     */
    @Around("applicationPackagePointcut()")
    public Object logMethodExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        Object[] args = joinPoint.getArgs();

        log.info("==> [ENTRY] {}.{}() with arguments: {}", className, methodName, Arrays.toString(args));

        long startTime = System.currentTimeMillis();
        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;
            
            log.info("<== [EXIT] {}.{}() completed in {} ms with return value: {}", 
                    className, methodName, duration, result);
            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("<== [EXCEPTION] {}.{}() threw exception after {} ms: {} - {}", 
                    className, methodName, duration, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }
}
