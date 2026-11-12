package dev.nx.console.search

import com.google.gson.JsonParser
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.progress.EmptyProgressIndicator
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.replaceService
import com.intellij.util.Processor
import dev.nx.console.nxls.NxlsRequestSender
import dev.nx.console.nxls.NxlsService
import dev.nx.console.nxls.server.NxlsLanguageServer
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertIs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.jsonrpc.Endpoint
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints

class NxSearchEverywhereContributorTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private lateinit var contributor: NxSearchEverywhereContributor
    private val requested = CountDownLatch(1)
    private val response = CompletableFuture<Any?>()

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        val server =
            ServiceEndpoints.toServiceObject(
                object : Endpoint {
                    override fun request(method: String, parameter: Any?): CompletableFuture<Any?> {
                        if (method == "nx/workspace") return CompletableFuture.completedFuture(null)
                        requested.countDown()
                        return response
                    }

                    override fun notify(method: String, parameter: Any?) {}
                },
                NxlsLanguageServer::class.java,
            )
        val service = NxlsService(project, scope)
        service.requestSender =
            object : NxlsRequestSender {
                override suspend fun <T> request(
                    sender: (NxlsLanguageServer) -> CompletableFuture<T>
                ): T? = sender(server).await()
            }
        project.replaceService(NxlsService::class.java, service, testRootDisposable)
        val context = SimpleDataContext.getProjectContext(project)
        contributor =
            NxSearchEverywhereContributor(
                AnActionEvent.createFromDataContext("test", null, context)
            )
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testFetchWaitsForResultsAndStopsWhenConsumerReturnsFalse() {
        val received = mutableListOf<String>()
        val future =
            ApplicationManager.getApplication().executeOnPooledThread<Unit> {
                contributor.fetchElements(
                    "@nx",
                    EmptyProgressIndicator(),
                    Processor {
                        received.add((it as NxSearchItem.Generator).generator.name)
                        false
                    },
                )
            }
        assertTrue(requested.await(10, TimeUnit.SECONDS))
        assertFalse("fetchElements returned before the request completed", future.isDone)
        response.complete(generators())
        future.get(10, TimeUnit.SECONDS)
        assertEqual(listOf("@nx/js:library"), received)
    }

    fun testCancellationWhileWaitingStopsTheRequest() {
        val indicator = EmptyProgressIndicator()
        val future =
            ApplicationManager.getApplication().executeOnPooledThread<Throwable?> {
                runCatching {
                        contributor.fetchElements(
                            "@nx",
                            indicator,
                            Processor {
                                fail("Cancelled searches must not send results to the consumer")
                                true
                            },
                        )
                    }
                    .exceptionOrNull()
            }
        assertTrue(requested.await(10, TimeUnit.SECONDS))
        indicator.cancel()
        assertIs<ProcessCanceledException>(future.get(10, TimeUnit.SECONDS))
        assertTrue(response.isCancelled)
    }

    fun testCancellationDuringDeliveryPreventsFurtherResults() {
        response.complete(generators())
        val indicator = EmptyProgressIndicator()
        val received = mutableListOf<String>()
        val future =
            ApplicationManager.getApplication().executeOnPooledThread<Throwable?> {
                runCatching {
                        contributor.fetchElements(
                            "@nx",
                            indicator,
                            Processor {
                                received.add((it as NxSearchItem.Generator).generator.name)
                                indicator.cancel()
                                true
                            },
                        )
                    }
                    .exceptionOrNull()
            }
        assertIs<ProcessCanceledException>(future.get(10, TimeUnit.SECONDS))
        assertEqual(listOf("@nx/js:library"), received)
    }

    private fun generators() =
        JsonParser.parseString(
            """[
              {"name":"@nx/js:library","data":{"collection":"@nx/js","name":"library","type":"generator"}},
              {"name":"@nx/node:library","data":{"collection":"@nx/node","name":"library","type":"generator"}}
            ]"""
        )
}
